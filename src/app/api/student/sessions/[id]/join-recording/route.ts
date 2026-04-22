import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { Session, SessionRecordingState } from "@/lib/types/session";

/** 生徒が録音に参加する */
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

  const now = new Date().toISOString();
  const existing: SessionRecordingState = session.recordingState ?? {
    teacherRecording: false,
    studentRecording: false,
  };
  const nextState: SessionRecordingState = {
    ...existing,
    studentRecording: true,
    studentStartedAt: now,
  };
  await ref.set(
    {
      recordingState: nextState,
      updatedAt: now,
    },
    { merge: true },
  );
  return NextResponse.json({ studentStartedAt: now });
}
