import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session, LessonTranscription } from "@/lib/types/session";

export const maxDuration = 300;

async function whisperTranscribe(
  audio: Buffer,
  apiKey: string,
  prompt?: string,
): Promise<LessonTranscription> {
  const formData = new FormData();
  const blob = new Blob([audio as unknown as BlobPart], { type: "audio/webm" });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "ja");
  formData.append("response_format", "verbose_json");
  if (prompt) formData.append("prompt", prompt);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Whisper ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    text?: string;
    language?: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };
  return {
    fullText: data.text ?? "",
    segments: (data.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
    language: data.language ?? "ja",
    transcribedAt: new Date().toISOString(),
  };
}

interface MergeSegment {
  absStart: number;
  text: string;
  speaker: "teacher" | "student";
}

/**
 * 講師/生徒の文字起こしを絶対時刻でマージし、話者分離した授業記録を作る。
 * fullText は [講師]/[生徒] ラベル付き (連続同一話者は結合)、segments は時系列ソート済み
 * (start = 最初の発話からの相対秒)。片方のみでも可。
 */
function buildLessonTranscript(
  teacher: LessonTranscription | undefined,
  teacherStartAtMs: number,
  student: LessonTranscription | undefined,
  studentStartAtMs: number,
): {
  fullText: string;
  segments: Array<{ speaker: "teacher" | "student"; start: number; text: string }>;
} {
  const raw: MergeSegment[] = [];
  if (teacher) {
    for (const s of teacher.segments) {
      raw.push({
        absStart: teacherStartAtMs + s.start * 1000,
        text: s.text.trim(),
        speaker: "teacher",
      });
    }
  }
  if (student) {
    for (const s of student.segments) {
      raw.push({
        absStart: studentStartAtMs + s.start * 1000,
        text: s.text.trim(),
        speaker: "student",
      });
    }
  }
  raw.sort((a, b) => a.absStart - b.absStart);

  const minAbs = raw.length > 0 ? raw[0].absStart : 0;
  const segments = raw
    .filter((s) => s.text)
    .map((s) => ({
      speaker: s.speaker,
      start: Math.max(0, Math.round((s.absStart - minAbs) / 1000)),
      text: s.text,
    }));

  const lines: string[] = [];
  let lastSpeaker: "teacher" | "student" | null = null;
  let currentLine = "";
  for (const seg of segments) {
    if (seg.speaker !== lastSpeaker) {
      if (currentLine) lines.push(currentLine);
      currentLine = `[${seg.speaker === "teacher" ? "講師" : "生徒"}] ${seg.text}`;
      lastSpeaker = seg.speaker;
    } else {
      currentLine += ` ${seg.text}`;
    }
  }
  if (currentLine) lines.push(currentLine);

  return { fullText: lines.join("\n"), segments };
}

/** POST /api/admin/sessions/[id]/merge-transcriptions
 *  両側の Whisper を実行し、タイムスタンプ sort + 話者ラベル付きで debrief.notes に挿入
 *  片方しかない場合もフォールバックで対応
 */
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

  const hasTeacher = Boolean(session.recordingPath);
  const hasStudent = Boolean(session.studentRecordingPath);

  if (!hasTeacher && !hasStudent) {
    return NextResponse.json(
      { error: "録音データがありません" },
      { status: 400 },
    );
  }

  const prompt = [
    session.studentName ? `生徒: ${session.studentName}` : "",
    session.prepPlan?.goal ? `議題: ${session.prepPlan.goal}` : "",
  ]
    .filter(Boolean)
    .join("。");

  let teacherTrans: LessonTranscription | undefined = session.transcription;
  let studentTrans: LessonTranscription | undefined = session.studentTranscription;

  try {
    const { getStorage } = await import("firebase-admin/storage");
    const bucket = getStorage().bucket();

    // teacher (未処理 or 強制再実行)
    if (hasTeacher && !teacherTrans) {
      const [buf] = await bucket.file(session.recordingPath!).download();
      teacherTrans = await whisperTranscribe(buf, apiKey, prompt);
    }
    // student
    if (hasStudent && !studentTrans) {
      const [buf] = await bucket.file(session.studentRecordingPath!).download();
      studentTrans = await whisperTranscribe(buf, apiKey, prompt);
    }
  } catch (err) {
    console.error("[merge-transcriptions] Whisper failed:", err);
    return NextResponse.json(
      { error: "文字起こしに失敗しました" },
      { status: 500 },
    );
  }

  // 絶対時刻 (ms)
  const teacherStartedAt =
    session.recordingState?.teacherStartedAt ?? session.startedAt ?? new Date().toISOString();
  const studentStartedAt =
    session.recordingState?.studentStartedAt ?? teacherStartedAt;

  const { fullText, segments } = buildLessonTranscript(
    teacherTrans,
    new Date(teacherStartedAt).getTime(),
    studentTrans,
    new Date(studentStartedAt).getTime(),
  );

  // 文字起こしは授業記録 (lessonTranscript) として保存。debrief.notes は講師メモ専用とし触らない。
  const now = new Date().toISOString();
  const lessonTranscript = { fullText, segments, transcribedAt: now };

  const update: Record<string, unknown> = {
    lessonTranscript,
    updatedAt: now,
  };
  if (teacherTrans) update.transcription = teacherTrans;
  if (studentTrans) update.studentTranscription = studentTrans;

  await ref.set(update, { merge: true });

  return NextResponse.json({
    lessonTranscript,
    hasTeacherTranscription: Boolean(teacherTrans),
    hasStudentTranscription: Boolean(studentTrans),
  });
}
