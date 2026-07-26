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
 * - total はモデルに計算させず、サーバー側で 5 軸を合計する（計算ミスを構造的に排除）。
 */
export const SkillCheckOutputSchema = z.object({
  scores: z.object({
    structure: z.number().int().min(0).max(10),
    logic: z.number().int().min(0).max(10),
    expression: z.number().int().min(0).max(10),
    apAlignment: z.number().int().min(0).max(10),
    originality: z.number().int().min(0).max(10),
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
