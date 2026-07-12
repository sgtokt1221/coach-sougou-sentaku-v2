import type { OcrCell, OcrOrientation, OcrCorrectedSpan } from "@/lib/types/ocr";

/**
 * レーベンシュタイン距離（挿入/削除/置換=各1）。
 * @param a 文字列A
 * @param b 文字列B
 * @returns 編集距離
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * CER（文字誤り率）= 編集距離 / 正解長。正解が空なら候補長>0 で 1、共に空で 0。
 * @param truth 正解テキスト
 * @param hyp 認識テキスト
 * @returns 0以上の実数
 */
export function characterErrorRate(truth: string, hyp: string): number {
  if (truth.length === 0) return hyp.length === 0 ? 0 : 1;
  return levenshtein(truth, hyp) / truth.length;
}

/**
 * 構造化セルを向き別の読み順で本文へ平文化する。
 * 縦書き: 列(大→小=右→左)優先、列内は行(小→大=上→下)。
 * 横書き: 行(小→大)優先、行内は列(小→大)。
 * 空セル("")はスキップ。判読不能("■")はそのまま残す。
 * @param cells マスの配列
 * @param orientation 用紙の向き
 * @returns 本文テキスト
 */
export function flattenCells(cells: OcrCell[], orientation: OcrOrientation): string {
  const sorted = [...cells].sort((p, q) => {
    if (orientation === "vertical") {
      if (q.col !== p.col) return q.col - p.col; // 右→左
      return p.row - q.row; // 上→下
    }
    // horizontal / unknown は横書き扱い
    if (p.row !== q.row) return p.row - q.row;
    return p.col - q.col;
  });
  return sorted.map((c) => c.char).join("");
}

/**
 * proposed と final を文字単位で比較し、置換された箇所を span 列で返す。
 * 位置ずれ（挿入/削除）は同一 index の from/to 差として近似記録する（評価用の粗い差分）。
 * @param proposed 提示テキスト
 * @param finalText 生徒確定テキスト
 * @returns 変更 span 配列
 */
export function diffSpans(proposed: string, finalText: string): OcrCorrectedSpan[] {
  const spans: OcrCorrectedSpan[] = [];
  const len = Math.max(proposed.length, finalText.length);
  for (let i = 0; i < len; i++) {
    const from = proposed[i] ?? "";
    const to = finalText[i] ?? "";
    if (from !== to) spans.push({ index: i, from, to });
  }
  return spans;
}
