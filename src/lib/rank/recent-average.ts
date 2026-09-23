/**
 * ランク（スキルバッジ）の元になる「直近の重み付き平均」。
 *
 * 新しい順に、重みの合計が RANK_WINDOW_WEIGHT に達するまでの提出で平均する。
 * 本添削・面接は重み1、ちょこ添削は重み0.5（CHOCO_WEIGHT）。窓をまたぐ1件は
 * 残りの重みだけ入れる。満点の違う記録（口頭試問型60点など）は scaleMax に揃える。
 *
 * 全期間の平均だと初期の低い点が伸びを隠し、直近30日の窓だと直近の1件で
 * ランクが決まった（2026-08-14 以前）。常に10件分を見る形にする（2026-09-23）。
 */
export const RANK_WINDOW_WEIGHT = 10;

export interface PracticeScore {
  /** その回の合計点 */
  value: number;
  /** その回の満点 */
  max: number;
  /** 本添削・面接は1、ちょこ添削は0.5 */
  weight: number;
  /** 提出時刻（ミリ秒）。新しい順に並べるのに使う */
  at: number;
}

export interface RecentAverage {
  /** scaleMax に揃えた重み付き平均。0件は null */
  avg: number | null;
  /** 平均に入れた記録の件数（窓をまたいだ1件も1と数える） */
  used: number;
}

export function recentWeightedAverage(
  items: PracticeScore[],
  scaleMax: number,
  window: number = RANK_WINDOW_WEIGHT
): RecentAverage {
  const sorted = items
    // 満点が0以下の記録は比率が作れないので除く（通常は起きない）
    .filter((x) => x.max > 0 && x.weight > 0 && Number.isFinite(x.value))
    .sort((a, b) => b.at - a.at);
  let weightSum = 0;
  let valueSum = 0;
  let used = 0;
  for (const x of sorted) {
    if (weightSum >= window) break;
    const w = Math.min(x.weight, window - weightSum);
    // 満点を超える／負の点（不正・旧データ）は 0〜満点に丸める。黙って平均を押し上げないため
    const ratio = Math.min(1, Math.max(0, x.value / x.max));
    valueSum += ratio * scaleMax * w;
    weightSum += w;
    used++;
  }
  return {
    avg:
      weightSum > 0 ? Math.round((valueSum / weightSum) * 1000) / 1000 : null,
    used,
  };
}
