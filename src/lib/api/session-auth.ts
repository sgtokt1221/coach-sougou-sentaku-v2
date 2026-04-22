import { NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";

/**
 * セッション API の認可ロジック (4 つの新 endpoint 共通)
 *
 * 許可条件 (OR):
 *  - role === "superadmin"
 *  - session.teacherId === auth.uid
 *  - session.createdByAdminId === auth.uid
 *  - users/{session.studentId}.managedBy === auth.uid
 */
export async function assertSessionAccess(
  adminDb: FirebaseFirestore.Firestore,
  session: Session,
  auth: { uid: string; role: string },
): Promise<NextResponse | null> {
  if (auth.role === "superadmin") return null;
  if (session.teacherId === auth.uid) return null;
  if (session.createdByAdminId === auth.uid) return null;

  if (!session.studentId) {
    return NextResponse.json(
      { error: "セッションに生徒が紐付いていません" },
      { status: 400 },
    );
  }

  try {
    const userDoc = await adminDb.doc(`users/${session.studentId}`).get();
    if (userDoc.exists && userDoc.data()?.managedBy === auth.uid) return null;
  } catch {
    // fall through to deny
  }

  return NextResponse.json(
    { error: "このセッションへのアクセス権がありません" },
    { status: 403 },
  );
}

/** 前回セッション取得 (同一生徒で現在より前、完了済みを優先) */
export async function getPreviousSession(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string,
  currentScheduledAt: string,
): Promise<Session | null> {
  try {
    const snap = await adminDb
      .collection("sessions")
      .where("studentId", "==", studentId)
      .where("scheduledAt", "<", currentScheduledAt)
      .orderBy("scheduledAt", "desc")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Session;
  } catch (err) {
    console.warn("[session-auth] getPreviousSession failed:", err);
    return null;
  }
}
