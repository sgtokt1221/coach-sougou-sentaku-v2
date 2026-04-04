import { adminDb } from "@/lib/firebase/admin";

/**
 * セッションベースのアクセス権チェック。
 * 講師が対象生徒とのアクティブなセッション（scheduled/in_progress）を持つか、
 * または完了後24時間以内のセッションがあればアクセスを許可する。
 */
export async function hasActiveSessionAccess(
  teacherUid: string,
  studentId: string
): Promise<boolean> {
  if (!adminDb) {
    // dev mode: モックセッションでは常にtrue
    return true;
  }

  const sessionsRef = adminDb.collection("sessions");

  // アクティブなセッション（scheduled or in_progress）
  const activeSnap = await sessionsRef
    .where("teacherId", "==", teacherUid)
    .where("studentId", "==", studentId)
    .where("status", "in", ["scheduled", "in_progress"])
    .limit(1)
    .get();

  if (!activeSnap.empty) return true;

  // 完了後24時間以内の猶予
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentSnap = await sessionsRef
    .where("teacherId", "==", teacherUid)
    .where("studentId", "==", studentId)
    .where("status", "==", "completed")
    .where("updatedAt", ">=", oneDayAgo)
    .limit(1)
    .get();

  return !recentSnap.empty;
}
