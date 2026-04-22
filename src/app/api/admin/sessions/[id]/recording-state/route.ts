import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session, SessionRecordingState } from "@/lib/types/session";

/** PATCH /api/admin/sessions/[id]/recording-state
 *  講師側の recordingState 更新 (teacher 録音開始/停止シグナル)
 */
export async function PATCH(
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

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  const body = (await request.json().catch(() => null)) as Partial<SessionRecordingState> | null;
  if (!body) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const existing: SessionRecordingState = session.recordingState ?? {
    teacherRecording: false,
    studentRecording: false,
  };
  const nextState: SessionRecordingState = {
    ...existing,
    ...(typeof body.teacherRecording === "boolean"
      ? { teacherRecording: body.teacherRecording }
      : {}),
    ...(typeof body.teacherStartedAt === "string"
      ? { teacherStartedAt: body.teacherStartedAt }
      : {}),
    ...(typeof body.stopRequestedAt === "string"
      ? { stopRequestedAt: body.stopRequestedAt }
      : {}),
  };
  await ref.set(
    {
      recordingState: nextState,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return NextResponse.json({ recordingState: nextState });
}
