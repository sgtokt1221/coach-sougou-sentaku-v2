import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { Session } from "@/lib/types/session";
import { recordingFormatOf } from "@/lib/audio/recording-format";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

/** 生徒の録音ファイルアップロード */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  if (session.studentId !== auth.uid) {
    return NextResponse.json(
      { error: "このセッションの生徒ではありません" },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const durationSecRaw = form.get("durationSec");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file フィールドが必須です" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `ファイルサイズが 25MB を超えています` },
      { status: 413 },
    );
  }
  const contentType = (file.type || "audio/webm").toLowerCase();
  const format = recordingFormatOf(contentType);
  // 生徒の録音はブラウザの録音だけ（webm か Safari の mp4）
  if (!format || (format.ext !== "webm" && format.ext !== "m4a")) {
    return NextResponse.json(
      { error: `対応していない形式です (${contentType})` },
      { status: 415 },
    );
  }

  const durationSec =
    typeof durationSecRaw === "string" ? parseInt(durationSecRaw, 10) : 0;

  // Storage
  const recordingPath = `sessions/${id}/student-recording.${format.ext}`;
  let recordingUrl = "";
  try {
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage().bucket();
    const sFile = bucket.file(recordingPath);
    const buffer = Buffer.from(await file.arrayBuffer());
    await sFile.save(buffer, {
      contentType: format.mime,
      resumable: false,
    });
    const [url] = await sFile.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });
    recordingUrl = url;
  } catch (err) {
    console.error("[student-recording] Storage save failed:", err);
    return NextResponse.json(
      { error: "録音ファイルの保存に失敗しました" },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const existingState = session.recordingState ?? {
    teacherRecording: false,
    studentRecording: false,
  };
  const { FieldValue } = await import("firebase-admin/firestore");
  await ref.set(
    {
      // 前の録音の文字起こしを使い回させない
      studentTranscription: FieldValue.delete(),
      studentRecordingUrl: recordingUrl,
      studentRecordingPath: recordingPath,
      studentRecordingSizeBytes: file.size,
      studentRecordingDurationSec: Number.isFinite(durationSec) ? durationSec : 0,
      recordingState: {
        ...existingState,
        studentRecording: false,
      },
      updatedAt: now,
    },
    { merge: true },
  );

  return NextResponse.json({
    studentRecordingUrl: recordingUrl,
    studentRecordingPath: recordingPath,
    studentRecordingSizeBytes: file.size,
    studentRecordingDurationSec: Number.isFinite(durationSec) ? durationSec : 0,
  });
}
