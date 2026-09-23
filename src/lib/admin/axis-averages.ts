import type { StudentDetail } from "@/lib/types/admin";

/** 小論文の項目別平均 (0-10)。旧採点の答案に無い軸は、あるものだけで平均し、全部無ければ null */
export type EssayAxisAverages = {
  structure: number;
  logic: number;
  expression: number;
  responsiveness: number | null;
  reasoningMaturity: number | null;
  apAlignment: number | null;
};

/** 面接の項目別平均 (0-10)。ボディランゲージは全回とも動画なしなら null */
export type InterviewAxisAverages = {
  clarity: number;
  apAlignment: number;
  enthusiasm: number;
  specificity: number;
  bodyLanguage: number | null;
};

const avgOf = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

/** 未評価(null/undefined)を 0 として混ぜない。全部未評価なら null */
const avgMeasured = (nums: (number | null | undefined)[]) => {
  const ns = nums.filter((n): n is number => typeof n === "number");
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
};

/**
 * 日々の取り組み（全提出）から項目別の平均を出す。
 * 生徒詳細の「項目別の平均」、スキルカードのレーダー、面談画面の生徒カードで共用する。
 * 提出が無い種別は undefined。
 */
export function computeAxisAverages(
  detail: Pick<StudentDetail, "essays" | "interviewScoreTrend">
): {
  essayAxisAvg: EssayAxisAverages | undefined;
  interviewAxisAvg: InterviewAxisAverages | undefined;
  essayCount: number;
  interviewCount: number;
} {
  const essayScoresList = detail.essays
    .map((e) => e.scores)
    .filter((s): s is NonNullable<typeof s> => !!s);
  const essayAxisAvg =
    essayScoresList.length > 0
      ? {
          structure: avgOf(essayScoresList.map((s) => s.structure)),
          logic: avgOf(essayScoresList.map((s) => s.logic)),
          expression: avgOf(essayScoresList.map((s) => s.expression)),
          // 回答力は v23 からの軸。旧採点の答案には無いので、あるものだけで平均する
          responsiveness: avgMeasured(
            essayScoresList.map((s) => s.responsiveness)
          ),
          reasoningMaturity: avgMeasured(
            essayScoresList.map((s) => s.reasoningMaturity)
          ),
          apAlignment: avgMeasured(essayScoresList.map((s) => s.apAlignment)),
        }
      : undefined;

  const ivTrend = detail.interviewScoreTrend ?? [];
  const interviewAxisAvg =
    ivTrend.length > 0
      ? {
          clarity: avgOf(ivTrend.map((p) => p.clarity)),
          apAlignment: avgOf(ivTrend.map((p) => p.apAlignment)),
          enthusiasm: avgOf(ivTrend.map((p) => p.enthusiasm)),
          specificity: avgOf(ivTrend.map((p) => p.specificity)),
          bodyLanguage: avgMeasured(ivTrend.map((p) => p.bodyLanguage)),
        }
      : undefined;

  return {
    essayAxisAvg,
    interviewAxisAvg,
    essayCount: essayScoresList.length,
    interviewCount: ivTrend.length,
  };
}
