import type { LanguageCorrection } from "@/lib/types/essay";

/**
 * 本人の答案から集めた赤ペン1件。書き直しドリルの素材になる。
 *
 * 静的な問題バンク（4択）と違い、これは「自分が実際に書いた文」なので、
 * なぜそう書いたかを思い出せる。選択肢を作る必要もない（自分で直す）。
 */
export interface RawCorrection {
  original: string;
  suggestion: string;
  type: LanguageCorrection["type"];
  reason: string;
  essayId: string;
  /** 並べ替え用。答案の提出時刻(ms) */
  submittedAt: number;
}

/**
 * 誤字（typo）は書き直し練習に向かない。直し方を考える余地がなく、
 * 見つけて直すだけの作業になるため（誤字は19講の推敲で扱う）。
 */
const EXCLUDED_TYPES: LanguageCorrection["type"][] = ["typo"];

/**
 * 素材にする文の長さの上限。
 *
 * 書き直しドリルは「一息で直せる1文」を扱う。これを超える引用は、実際には
 * 文の直しではなく内容の指摘（要約の方向が違う、主張と根拠が噛み合っていない等）が
 * languageCorrections に混ざったものだった。内容の指摘は課題文や資料を読み直さないと
 * 直せないので、ドリルとして成立しない。
 */
const MAX_ORIGINAL_LENGTH = 60;

/** 出題済みかどうかを判定するキー。元の文が同じなら同じ問題とみなす。 */
export function correctionKey(c: Pick<RawCorrection, "original">): string {
  return c.original.trim().replace(/\s+/g, "");
}

/**
 * 出題する赤ペンを選ぶ。新しい答案のものから順に、まだ出していないものを取る。
 * 素材が足りなければ取れただけ返す（呼び出し側でラウンドごと省く）。
 */
export function pickPersonalItems(
  corrections: RawCorrection[],
  usedKeys: Set<string>,
  count: number
): RawCorrection[] {
  const seen = new Set<string>();
  return corrections
    .filter((c) => !EXCLUDED_TYPES.includes(c.type))
    .filter((c) => {
      const len = c.original.trim().length;
      return len >= 8 && len <= MAX_ORIGINAL_LENGTH;
    })
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .filter((c) => {
      const key = correctionKey(c);
      if (usedKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}
