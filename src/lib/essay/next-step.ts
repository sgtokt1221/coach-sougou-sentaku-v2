import {
  ESSAY_SCORE_WEIGHTS,
  type EssayScoreAxis,
  type EssayScores,
} from "@/lib/types/essay";
import { getRankFromPercentage, type ScoreRank } from "@/lib/score-rank";

/**
 * 次のランクまでの差と、その差を埋めるのに一番効く軸を出す。
 *
 * 生徒は点とランクだけを見て画面を閉じる。ランクの隣に「あと何点で上がるか」と
 * 「その点はどこで取れるか」を置けば、数字を見た視線がそのまま次の行動につながる。
 */

/** 表示に使うランクの並び（下から上へ） */
const RANK_THRESHOLDS: { rank: ScoreRank; percentage: number }[] = [
  { rank: "D", percentage: 21 },
  { rank: "C", percentage: 45 },
  { rank: "B", percentage: 60 },
  { rank: "A", percentage: 75 },
  { rank: "S", percentage: 90 },
];

export interface NextRankGap {
  nextRank: ScoreRank;
  /** あと何点で届くか（0.1点단位で丸めた表示用の値） */
  needed: number;
}

/**
 * 次のランクまでの差。すでに最高ランクなら null。
 *
 * 「あと0点」と出ると意味が通らないので、境界ちょうどの場合も
 * 次のランクを見に行く（同じランクの中で満点でも上が無ければ null）。
 */
export function nextRankGap(total: number, max: number): NextRankGap | null {
  if (max <= 0) return null;
  const current = getRankFromPercentage((total / max) * 100);
  if (current === "S") return null;

  for (const t of RANK_THRESHOLDS) {
    const requiredPoints = (t.percentage / 100) * max;
    if (requiredPoints > total) {
      const needed = Math.round((requiredPoints - total) * 10) / 10;
      // 0.1点未満の差は「あと0点」に見えるので、最低0.1点として出す
      return { nextRank: t.rank, needed: Math.max(0.1, needed) };
    }
  }
  return null;
}

export interface AxisHeadroom {
  axis: EssayScoreAxis;
  /** いまの点（0-10） */
  score: number;
  /** その軸の配点 */
  weight: number;
  /** その軸を満点にしたときに増える合計点 */
  gain: number;
}

/**
 * 伸びしろが一番大きい軸。
 *
 * 「点が低い軸」ではなく「配点で見て一番増える軸」を選ぶ。独自性(配点5)を
 * 0点から満点にしても5点だが、構成(配点12)を6点から満点にすれば4.8点増える。
 * 生徒に勧めるのは、同じ努力で点が動く側であるべき。
 */
export function biggestHeadroom(
  scores: Partial<Record<EssayScoreAxis, number | null | undefined>>
): AxisHeadroom | null {
  const axes = Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[];
  let best: AxisHeadroom | null = null;

  for (const axis of axes) {
    const score = scores[axis];
    if (typeof score !== "number") continue;
    const weight = ESSAY_SCORE_WEIGHTS[axis];
    const gain = Math.round((10 - score) * (weight / 10) * 10) / 10;
    if (gain <= 0) continue;
    // 同じ伸びしろなら配点の大きい軸を選ぶ（指導の優先順位が高い）
    if (
      !best ||
      gain > best.gain ||
      (gain === best.gain && weight > best.weight)
    ) {
      best = { axis, score, weight, gain };
    }
  }
  return best;
}

/** 画面に出す1行。次のランクが無い、または軸が取れないときは null */
export function buildNextStepHint(
  scores: EssayScores,
  max: number
): { gap: NextRankGap; headroom: AxisHeadroom } | null {
  const gap = nextRankGap(scores.total, max);
  if (!gap) return null;
  const headroom = biggestHeadroom(scores);
  if (!headroom) return null;
  return { gap, headroom };
}
