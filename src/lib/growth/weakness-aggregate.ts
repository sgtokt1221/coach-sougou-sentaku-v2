import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * essays / interviews ドキュメント群から `weaknessTags` フィールドを集計し、
 * 「弱点ごとの指摘回数」を `Record<area, count>` で返す。
 *
 * 用途: 成長レポート生成時に「今期間 vs 前期間」の指摘頻度を比較するため。
 */
export function collectWeaknessTags(
  docs: QueryDocumentSnapshot[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const data = d.data() as { weaknessTags?: unknown };
    const tags = data.weaknessTags;
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) {
      if (typeof tag !== "string") continue;
      counts[tag] = (counts[tag] ?? 0) + 1;
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
