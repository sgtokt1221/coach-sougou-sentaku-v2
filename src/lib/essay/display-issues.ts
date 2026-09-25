/**
 * 添削結果の画面に並べる弱点を選ぶ。
 *
 * repeatedIssues は AI の弱点のあとに判定欄からの派生分（derived: true）が
 * 続くので、先頭から切ると派生分が見えなくなる。両方あるときは派生分も
 * 最低1件（多ければ2件）入れ、残りを AI の弱点で埋める。並びは AI → 派生。
 * クライアントから使うので、サーバー側の derive（講座データを読む）とは分けている。
 */
export const DISPLAY_ISSUES_MAX = 5;
/** AI の弱点と派生分が両方あるとき、派生分に取っておく枠 */
const DERIVED_SLOTS = 2;

export function pickDisplayIssues<T extends { derived?: boolean }>(
  issues: T[],
  max: number = DISPLAY_ISSUES_MAX
): T[] {
  const ai = issues.filter((i) => i.derived !== true);
  const derived = issues.filter((i) => i.derived === true);
  const aiTake = Math.min(
    ai.length,
    max - Math.min(derived.length, DERIVED_SLOTS)
  );
  return [...ai.slice(0, aiTake), ...derived.slice(0, max - aiTake)];
}
