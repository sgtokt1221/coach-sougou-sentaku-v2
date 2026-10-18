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

  /**
   * 録音を始め直すときは前回の状態を持ち越さない。停止の印（stopRequestedAt）が
   * 残ると生徒に参加の案内が出ず、前回の生徒の録音が今回の講師の録音と組まれる。
   */
  const isRestart =
    body.teacherRecording === true && typeof body.teacherStartedAt === "string";
  const existing: SessionRecordingState =
    isRestart || !session.recordingState
      ? { teacherRecording: false, studentRecording: false }
      : session.recordingState;
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
  const { FieldValue } = await import("firebase-admin/firestore");
  // update で recordingState を丸ごと置き換える（set merge は入れ子の古い項目を残す）
  await ref.update({
    recordingState: nextState,
    ...(isRestart
      ? {
          studentRecordingPath: FieldValue.delete(),
          studentRecordingUrl: FieldValue.delete(),
          studentTranscription: FieldValue.delete(),
        }
      : {}),
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ recordingState: nextState });
}
