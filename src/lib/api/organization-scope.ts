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
 * admin の所属組織メンバー(admin uid)一覧を返す。
 * 組織未所属なら自分のみ [adminUid]（＝従来の managedBy==自分 と同等）。
 */
export async function getOrgMemberAdminUids(
  adminDb: Firestore,
  adminUid: string,
): Promise<string[]> {
  const me = (await adminDb.doc(`users/${adminUid}`).get()).data() ?? {};
  const orgId = typeof me.organizationId === "string" ? me.organizationId : null;
  if (!orgId) return [adminUid];
  const org = (await adminDb.doc(`organizations/${orgId}`).get()).data() ?? {};
  const members: string[] = Array.isArray(org.memberAdminUids) ? org.memberAdminUids : [];
  return Array.from(new Set<string>([adminUid, ...members]));
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
