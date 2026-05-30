import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { resolveCanonical, canonicalLabel } from "@/lib/growth/weakness-taxonomy";

/**
 * 生の weaknessTag を「集計キー」へ正規化する。
 *
 * 統合後の WeaknessRecord.area は正規タクソノミーのラベルになっているため、
 * 期間別カウントも同じ正規ラベルでキー付けしないと改善/悪化判定が一致しない。
 * 正規化できない (resolveCanonical=null) タグは生文字列のままキーにする
 * (= 従来の自由文弱点と整合)。
 */
function aggregationKey(tag: string): string {
  const entry = resolveCanonical(tag);
  return entry ? canonicalLabel(entry.id) : tag;
}

/**
 * essays / interviews ドキュメント群から `weaknessTags` フィールドを集計し、
 * 「弱点ごとの指摘回数」を `Record<area, count>` で返す。
 *
 * 用途: 成長レポート生成時に「今期間 vs 前期間」の指摘頻度を比較するため。
 *
 * キーは正規ラベルへ畳む (統合後の WeaknessRecord.area と一致させる)。
 * 同一ドキュメント内で複数タグが同じ正規ラベルに解決された場合は 1 回だけ
 * 数える (= 1 提出 = 最大 +1。 ランタイムの提出内デデュープと同じ意味論)。
 */
export function collectWeaknessTags(
  docs: QueryDocumentSnapshot[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const data = d.data() as { weaknessTags?: unknown };
    const tags = data.weaknessTags;
    if (!Array.isArray(tags)) continue;
    const seenInDoc = new Set<string>();
    for (const tag of tags) {
      if (typeof tag !== "string") continue;
      const key = aggregationKey(tag);
      if (seenInDoc.has(key)) continue;
      seenInDoc.add(key);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * 複数の `Record<string, number>` を **加算マージ** する。
 * 同じキーがある場合は値を足し合わせる (spread は上書きになるので不適切)。
 */
export function mergeCountMaps(
  ...maps: Record<string, number>[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}
