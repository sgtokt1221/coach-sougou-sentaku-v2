/**
 * 弱点テキストの類似度計算 (Phase 3 同義語マージ用)。
 *
 * 方針: 完全 AI 判定は高コスト → シンプルなテキスト処理で十分:
 *   1. normalize() で助詞 / 空白 / 句読点を除去
 *   2. 文字 bi-gram の Jaccard 係数を計算
 *
 * 例:
 *   weaknessSimilarity("具体性の欠如", "具体性が欠如")  = 1.00  (= 助詞違いのみ)
 *   weaknessSimilarity("具体性の欠如", "具体性欠如")    = 1.00
 *   weaknessSimilarity("具体性の欠如", "具体例の不足")  ≈ 0.14  (= 別物)
 *   weaknessSimilarity("主語の曖昧さ", "主語があいまい") ≈ 0.42  (= 部分一致)
 *
 * 閾値 SIMILARITY_THRESHOLD = 0.7 で「同義」 とみなす。
 */

const PARTICLE_RE = /[はがのをにでとも]/g;
const PUNCT_RE = /[\s　、。「」『』（）()\-ー]/g;

/** 助詞 / 空白 / 句読点を除去して比較しやすい形に正規化 */
export function normalize(s: string): string {
  return s.replace(PUNCT_RE, "").replace(PARTICLE_RE, "").toLowerCase();
}

/** 文字 bi-gram (2 文字ずつスライド) の集合を返す。 1 文字なら文字単体を含む */
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  if (s.length === 0) return out;
  if (s.length === 1) {
    out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i++) {
    out.add(s.slice(i, i + 2));
  }
  return out;
}

/** Jaccard 係数: |A ∩ B| / |A ∪ B|。 両方空なら 1 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** 2 つの弱点テキストの類似度 (0-1)。 正規化後完全一致は 1 */
export function weaknessSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  return jaccard(bigrams(na), bigrams(nb));
}

/** 同義とみなす類似度の閾値。 厳しすぎず緩すぎずの中庸 */
export const SIMILARITY_THRESHOLD = 0.7;

/**
 * 既存リストから、 与えられた新規 area と最も類似する既存 area を探す。
 * 閾値未満なら null。
 *
 * - existingAreas は通常「同じ categoryId」 のものだけ渡す (= カテゴリ
 *   をまたいだ誤マージを防ぐため)
 * - 同点の場合は配列の先頭側を返す
 */
export function findSimilarArea(
  newArea: string,
  existingAreas: string[],
  threshold = SIMILARITY_THRESHOLD,
): { area: string; score: number } | null {
  let best: { area: string; score: number } | null = null;
  for (const existing of existingAreas) {
    if (existing === newArea) return { area: existing, score: 1 };
    const score = weaknessSimilarity(newArea, existing);
    if (score >= threshold && (!best || score > best.score)) {
      best = { area: existing, score };
    }
  }
  return best;
}
