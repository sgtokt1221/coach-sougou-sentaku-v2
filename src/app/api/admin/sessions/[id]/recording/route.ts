import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session } from "@/lib/types/session";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "video/mp4",
  "video/webm",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const sessionSnap = await adminDb.doc(`sessions/${id}`).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: sessionSnap.id, ...sessionSnap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  const form = await request.formData();
  const file = form.get("file");
  const durationSecRaw = form.get("durationSec");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file フィールドが必須です" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `ファイルサイズが 25MB を超えています (${Math.round(file.size / 1024 / 1024)}MB)`,
      },
      { status: 413 },
    );
  }
  const contentType = (file.type || "audio/webm").toLowerCase();
  if (!ALLOWED_MIMES.some((m) => contentType.startsWith(m.split(";")[0]))) {
    return NextResponse.json(
      { error: `対応していない形式です (${contentType})` },
      { status: 415 },
    );
  }

  const durationSec =
    typeof durationSecRaw === "string" ? parseInt(durationSecRaw, 10) : 0;

  // Storage upload
  let recordingUrl = "";
  const recordingPath = `sessions/${id}/recording.webm`;
  try {
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage().bucket();
    const sFile = bucket.file(recordingPath);
    const buffer = Buffer.from(await file.arrayBuffer());
    await sFile.save(buffer, {
      contentType: "audio/webm",
      resumable: false,
    });
    const [url] = await sFile.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });
    recordingUrl = url;
  } catch (err) {
    console.error("[recording] Storage save failed:", err);
    return NextResponse.json(
      { error: "録音ファイルの保存に失敗しました" },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  await adminDb.doc(`sessions/${id}`).set(
    {
      recordingUrl,
      recordingPath,
      recordingSizeBytes: file.size,
      recordingDurationSec: Number.isFinite(durationSec) ? durationSec : 0,
      updatedAt: now,
    },
    { merge: true },
  );

  return NextResponse.json({
    recordingUrl,
    recordingPath,
    recordingSizeBytes: file.size,
    recordingDurationSec: Number.isFinite(durationSec) ? durationSec : 0,
  });
}
