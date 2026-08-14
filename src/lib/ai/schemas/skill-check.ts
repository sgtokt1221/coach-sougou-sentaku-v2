import { z } from "zod";

const boundedText = z.string().max(2000);
const shortText = z.string().max(500);

/**
 * スキルチェック採点の構造化出力スキーマ。
 *
 * 小論文添削の EssayReviewOutputSchema とは別に定義している:
 * - スキルチェックでは topicInsights / languageCorrections / reportInsights /
 *   repeatedIssues / improvementsSinceLast を使わない（プロンプトでも「空配列で構わない」と指示）。
 *   構造化出力では全フィールドが必須になるため、不要なものを含めると
 *   生成が遅くなり、無意味な内容を書かせることになる。
 * - total はモデルに計算させず、サーバー側で 5 軸を重み付けして合計する
 *   （計算ミスを構造的に排除。配点は ESSAY_SCORE_WEIGHTS）。
 *
 * v2 で軸を小論文添削（essay-review-v14）に揃えた。系統適合(apAlignment)を廃止し、
 * 議論の成熟度(reasoningMaturity)を追加している。スキルチェックの合計は
 * 練習（小論文添削）の平均と同じ0-50スケールで合成されるため、軸が違うと
 * 合成値の意味が壊れる（src/lib/skill-check/aggregate.ts）。
 */
export const SkillCheckOutputSchema = z.object({
  scores: z.object({
    structure: z.number().int().min(0).max(10),
    logic: z.number().int().min(0).max(10),
    expression: z.number().int().min(0).max(10),
    originality: z.number().int().min(0).max(10),
    reasoningMaturity: z.number().int().min(0).max(10),
  }),
  feedback: z.object({
    overall: boundedText,
    goodPoints: z.array(shortText).max(5),
    improvements: z.array(boundedText).max(5),
    priorityImprovement: boundedText,
    nextChallenge: boundedText,
  }),
});

export type SkillCheckOutput = z.infer<typeof SkillCheckOutputSchema>;
