import type { ChocoScores } from "@/lib/types/choco";
import { ESSAY_SCORE_WEIGHTS } from "@/lib/types/essay";

/**
 * ちょこ添削で採点できない2軸（独自性・議論の成熟度）を、採点できた3軸の平均から
 * 何点低く見積もるか。
 *
 * ちょこ添削は完成した小論文の1段落だけを書く練習なので、独自性と議論の成熟度は
 * 構造的に測れない（題材も論の骨格も与えられている）。合計を0-50へ換算するには
 * この2軸を何らかの形で置くしかないため、本添削の実データから差を取った。
 *
 * 本番の小論文添削20件（成熟度あり）の実測:
 *   構成/論理/表現の平均 4.97 / 独自性・成熟度の平均 4.08 → 差 0.89
 *
 * 実データが増えたら測り直すこと（scripts に測定用の使い捨てを置かず、
 * essays の scores から同じ計算をすれば出る）。
 */
const UNMEASURED_AXIS_GAP = 0.9;

/**
 * 3軸(各0-10)を本添削と同じ 0-50 スケールへ換算する。
 *
 * 軸の対応:
 *   coherence（前後とのつながり） → 構成（配点12）
 *   logic                         → 論理性（配点12）
 *   expression                    → 表現力（配点11）
 *   独自性(5) + 議論の成熟度(10)  → 測れないので3軸平均 − UNMEASURED_AXIS_GAP で置く
 *
 * 以前は (logic + coherence + expression) / 30 * 50 で、3軸を等配点として扱い、
 * 測れない2軸は3軸平均そのままと仮定していた。本添削は配点が均等ではなく、
 * 独自性・成熟度は実際に低く出るため、ちょこ添削の合計だけが高く出ていた。
 * この換算は同じ0-50で練習平均として合算される（skill-check/aggregate）。
 *
 * 満点が50に届かないのは意図的。1段落だけでは独自性と議論の成熟度を示しきれない。
 */
export function computeChocoTotal(
  s: Pick<ChocoScores, "logic" | "coherence" | "expression">,
): number {
  const clamp = (n: number) => Math.max(0, Math.min(10, n));
  const logic = clamp(s.logic);
  const coherence = clamp(s.coherence);
  const expression = clamp(s.expression);

  const measuredAvg = (logic + coherence + expression) / 3;
  const estimated = Math.max(0, measuredAvg - UNMEASURED_AXIS_GAP);

  const weighted =
    coherence * ESSAY_SCORE_WEIGHTS.structure +
    logic * ESSAY_SCORE_WEIGHTS.logic +
    expression * ESSAY_SCORE_WEIGHTS.expression +
    estimated *
      (ESSAY_SCORE_WEIGHTS.originality + ESSAY_SCORE_WEIGHTS.reasoningMaturity);

  return Math.round(weighted / 10);
}
