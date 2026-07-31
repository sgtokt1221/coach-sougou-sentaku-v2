import type { Firestore } from "firebase-admin/firestore";

/**
 * 組織(塾)単位のデータ共有スコープ用ヘルパ。
 *
 * 同じ塾(organization)の管理者(admin)同士で生徒データを共有するため、
 * 「組織メンバーのいずれかが managedBy になっている生徒」を対象にする。
 * 生徒(users)ドキュメントに organizationId が無くても動くよう、
 * organizations.memberAdminUids を解決して managedBy で引く方式を取る。
 *
 * ※ サーバー専用 (Admin SDK)。teacher/superadmin のスコープは各APIの既存分岐を維持し、
 *   本ヘルパは admin の生徒共有にのみ使う。
 */

/** 配列を size 件ずつに分割 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 所属の正本は users/{uid}.organizationId ひとつだけ。
 *
 * 以前は organizations.memberAdminUids との二重管理で、片方だけ更新すると
 * 黙ってズレた。所属は users 側だけを見て、メンバー一覧はそこから引く。
 */
export async function getUserOrgId(
  adminDb: Firestore,
  uid: string,
): Promise<string | undefined> {
  const me = (await adminDb.doc(`users/${uid}`).get()).data() ?? {};
  return typeof me.organizationId === "string" ? me.organizationId : undefined;
}

/**
 * ある塾に所属するスタッフ(admin/teacher)の uid 一覧。
 * 生徒の managedBy がこの中にあれば「同じ塾の生徒」とみなす。
 */
export async function getOrgStaffUids(
  adminDb: Firestore,
  organizationId: string,
): Promise<string[]> {
  const snap = await adminDb
    .collection("users")
    .where("organizationId", "==", organizationId)
    .get();
  return snap.docs
    .filter((d) => ["admin", "teacher", "superadmin"].includes(d.data().role))
    .map((d) => d.id);
}

/**
 * admin の所属組織メンバー(スタッフ uid)一覧を返す。
 * 組織未所属なら自分のみ [adminUid]（＝従来の managedBy==自分 と同等）。
 */
export async function getOrgMemberAdminUids(
  adminDb: Firestore,
  adminUid: string,
): Promise<string[]> {
  const orgId = await getUserOrgId(adminDb, adminUid);
  if (!orgId) return [adminUid];
  const staff = await getOrgStaffUids(adminDb, orgId);
  return Array.from(new Set<string>([adminUid, ...staff]));
}

/**
 * 担当者(managedBy)に合わせて所属を揃えるための更新フィールドを返す。
 *
 * 生徒の担当を別の塾の管理者へ移したのに organizationId が古いままだと、
 * 移管元の塾からも見え続ける（scopeByOrganization の組織一致パス）。
 * 担当を変える処理では必ずこれを混ぜること。
 */
export async function orgFieldsFollowingManager(
  adminDb: Firestore,
  managerUid: string,
): Promise<{ organizationId?: string }> {
  const orgId = await getUserOrgId(adminDb, managerUid);
  return orgId ? { organizationId: orgId } : {};
}

/**
 * 分析(analytics)用の閲覧可能な生徒ID集合を返す。
 * - superadmin: null（フィルタ無し＝全件）
 * - admin: 自分の塾の組織メンバーが managedBy の生徒
 * - teacher: 自分が managedBy の生徒（従来挙動）
 */
export async function getAnalyticsStudentIdSet(
  adminDb: Firestore,
  uid: string,
  role: string,
): Promise<Set<string> | null> {
  if (role === "superadmin") return null;
  if (role === "admin") {
    return new Set(await getOrgScopedStudentIds(adminDb, uid));
  }
  const snap = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .where("managedBy", "==", uid)
    .get();
  return new Set(snap.docs.map((d) => d.id));
}

/**
 * スタッフ（admin / teacher）一覧を自塾に絞るための organizationId を返す。
 *
 * - superadmin → null（絞らない＝全塾）
 * - organizationId を持つ → その値で絞る
 * - organizationId が無い → undefined（＝1件も返さない）
 *
 * 生徒は managedBy で組織に紐づくが、講師には managedBy が無いため
 * organizationId が唯一の手掛かりになる。所属不明のスタッフを他塾に
 * 見せるより、見せない方に倒す（招待時に organizationId を必ず入れること）。
 */
export async function getStaffOrgFilter(
  adminDb: Firestore,
  uid: string,
  role: string,
): Promise<{ scoped: false } | { scoped: true; organizationId: string | undefined }> {
  if (role === "superadmin") return { scoped: false };
  const me = (await adminDb.doc(`users/${uid}`).get()).data() ?? {};
  const orgId = typeof me.organizationId === "string" ? me.organizationId : undefined;
  return { scoped: true, organizationId: orgId };
}

/**
 * admin が閲覧できる生徒の uid 集合（組織メンバーが managedBy の生徒）を返す。
 * Firestore の in は最大30要素なのでチャンク分割する。
 */
export async function getOrgScopedStudentIds(
  adminDb: Firestore,
  adminUid: string,
): Promise<string[]> {
  const memberUids = await getOrgMemberAdminUids(adminDb, adminUid);
  const ids = new Set<string>();
  for (const part of chunk(memberUids, 30)) {
    const snap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("managedBy", "in", part)
      .get();
    snap.docs.forEach((d) => ids.add(d.id));
  }
  return Array.from(ids);
}
