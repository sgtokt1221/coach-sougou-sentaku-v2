import { NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";

/**
 * セッション API の認可ロジック (session 系 endpoint 共通)
 *
 * 許可条件 (OR):
 *  - role === "superadmin"
 *  - session.teacherId === auth.uid              （担当講師本人）
 *  - session.createdByAdminId === auth.uid        （作成者本人）
 *  - role === "admin" かつ session が自塾(組織)のもの（管理者は自塾内なら常に代行可）
 *  - users/{session.studentId}.managedBy === auth.uid（その生徒の担当）
 *
 * ※ 管理者の代行は「自塾(organization)内」に限定する。越境(他塾のセッション)は
 *   マルチテナント保護のため不可。判定は createdByAdminId / 生徒の managedBy が
 *   自塾の admin メンバーに含まれるかで行う（sessions 一覧 GET の組織スコープと同基準）。
 */
export async function assertSessionAccess(
  adminDb: FirebaseFirestore.Firestore,
  session: Session,
  auth: { uid: string; role: string },
): Promise<NextResponse | null> {
  if (auth.role === "superadmin") return null;
  if (session.teacherId === auth.uid) return null;
  if (session.createdByAdminId === auth.uid) return null;

  // 管理者は自塾(組織)のセッションなら常に代行できる。
  if (auth.role === "admin") {
    try {
      const { getOrgMemberAdminUids } = await import("@/lib/api/organization-scope");
      const memberUids = new Set(await getOrgMemberAdminUids(adminDb, auth.uid));
      if (session.createdByAdminId && memberUids.has(session.createdByAdminId)) {
        return null;
      }
      if (session.studentId) {
        const sdoc = await adminDb.doc(`users/${session.studentId}`).get();
        const mb = sdoc.exists ? (sdoc.data()?.managedBy as string | undefined) : undefined;
        if (mb && memberUids.has(mb)) return null;
      }
    } catch {
      // 組織解決に失敗した場合は下の既定判定にフォールバック
    }
  }

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
