import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session, LessonTranscription } from "@/lib/types/session";

export const maxDuration = 300;

function buildWhisperPrompt(session: Session): string {
  const parts: string[] = [];
  if (session.studentName) parts.push(`生徒: ${session.studentName}`);
  if (session.prepPlan?.goal) parts.push(`本日の議題: ${session.prepPlan.goal}`);
  if (session.theme) parts.push(`テーマ: ${session.theme}`);
  return parts.length > 0 ? parts.join("。") : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "文字起こし機能は現在利用できません" },
      { status: 503 },
    );
  }

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
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (!session.recordingPath) {
    return NextResponse.json(
      { error: "録音データが見つかりません" },
      { status: 400 },
    );
  }

  // Download from Storage
  let audioBuffer: Buffer;
  try {
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage().bucket();
    const [buf] = await bucket.file(session.recordingPath).download();
    audioBuffer = buf;
  } catch (err) {
    console.error("[transcribe] Storage download failed:", err);
    return NextResponse.json(
      { error: "録音ファイルの取得に失敗しました" },
      { status: 500 },
    );
  }

  // Whisper API (REST)
  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: "audio/webm" });
    formData.append("file", blob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "ja");
    formData.append("response_format", "verbose_json");
    const prompt = buildWhisperPrompt(session);
    if (prompt) formData.append("prompt", prompt);

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      },
    );
    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("[transcribe] Whisper error:", whisperRes.status, errText);
      return NextResponse.json(
        { error: "文字起こしに失敗しました" },
        { status: 500 },
      );
    }
    const data = (await whisperRes.json()) as {
      text?: string;
      language?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    const transcription: LessonTranscription = {
      fullText: data.text ?? "",
      segments: (data.segments ?? []).map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      language: data.language ?? "ja",
      transcribedAt: new Date().toISOString(),
    };

    // debrief.notes に挿入
    const existingNotes = session.debrief?.notes ?? "";
    const newNotes =
      existingNotes.trim().length === 0
        ? transcription.fullText
        : `${existingNotes}\n\n--- 録音文字起こし ---\n${transcription.fullText}`;

    const debrief = {
      notes: newNotes.slice(0, 8000),
      newWeaknessAreas: session.debrief?.newWeaknessAreas ?? [],
      parentSummary: session.debrief?.parentSummary ?? "",
      nextAgendaSeed: session.debrief?.nextAgendaSeed ?? "",
      capturedAt: new Date().toISOString(),
    };

    await ref.set(
      {
        transcription,
        debrief,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({
      transcription,
      debriefNotes: debrief.notes,
    });
  } catch (err) {
    console.error("[transcribe] unexpected error:", err);
    return NextResponse.json(
      { error: "文字起こし処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
