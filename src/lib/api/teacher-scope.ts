/**
 * 生徒の担当講師 uid 配列を、新旧フィールド両対応で取り出す。
 *
 * - 新: `assignedTeacherIds: string[]`（複数講師対応）
 * - 旧: `assignedTeacherId: string`（単一講師時代の名残）
 *
 * 移行が完了するまでの後方互換のため、読み取りは必ずこのヘルパーを通す。
 */
export function getAssignedTeacherIds(
  userData: { assignedTeacherIds?: unknown; assignedTeacherId?: unknown } | undefined | null,
): string[] {
  if (!userData) return [];
  const arr = userData.assignedTeacherIds;
  if (Array.isArray(arr)) {
    return arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  const single = userData.assignedTeacherId;
  return typeof single === "string" && single.length > 0 ? [single] : [];
}
