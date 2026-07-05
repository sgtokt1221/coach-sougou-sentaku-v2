/**
 * 本添削(重み1.0)とちょこ添削(重み chocoWeight)の練習スコアを重み付き平均する。
 * count はモード判定用の生の件数(essay + choco)。
 */
export function blendPracticeScores(
  essayTotals: number[],
  chocoTotals: number[],
  chocoWeight: number,
): { avg: number | null; count: number } {
  const wSum =
    essayTotals.reduce((a, b) => a + b, 0) +
    chocoTotals.reduce((a, b) => a + b, 0) * chocoWeight;
  const wCount = essayTotals.length + chocoTotals.length * chocoWeight;
  return {
    avg: wCount > 0 ? wSum / wCount : null,
    count: essayTotals.length + chocoTotals.length,
  };
}
