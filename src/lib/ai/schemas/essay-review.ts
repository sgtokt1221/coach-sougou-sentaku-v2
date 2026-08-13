import { z } from "zod";

const boundedText = z.string().max(2000);
const shortText = z.string().max(500);

export const EssayReviewOutputSchema = z.object({
  scores: z.object({
    structure: z.number().int().min(0).max(10),
    logic: z.number().int().min(0).max(10),
    expression: z.number().int().min(0).max(10),
    apAlignment: z.number().int().min(0).max(10),
    originality: z.number().int().min(0).max(10),
    reasoningMaturity: z.number().int().min(0).max(10),
  }),
  feedback: z.object({
    overall: boundedText,
    // 件数の上限はスキーマでは緩めに取り、表示件数はサーバー側で絞る。
    // 上限を厳しくすると「助言を出しすぎた」だけで構造化出力の検証に失敗し、
    // 添削全体が 500 になる（課題文型(report)で実際に improvements が5件を
    // 超えて発生した）。
    goodPoints: z.array(shortText).max(10),
    priorityImprovement: boundedText,
    improvements: z.array(boundedText).max(10),
    nextChallenge: boundedText,
    repeatedIssues: z
      .array(
        z.object({
          area: shortText,
          category: z.enum([
            "structure",
            "logic",
            "expression",
            "apAlignment",
            "originality",
            "reasoningMaturity",
            "other",
          ]),
          count: z.number().int().min(1).max(99),
          message: boundedText,
        })
      )
      .max(8),
    improvementsSinceLast: z
      .array(
        z.object({
          area: shortText,
          before: boundedText,
          after: boundedText,
          message: boundedText,
        })
      )
      .max(5),
    topicInsights: z.object({
      background: boundedText,
      relatedThemes: z.array(shortText).max(5),
      deepDivePoints: z.array(boundedText).max(5),
      recommendedAngle: boundedText,
    }),
    languageCorrections: z
      .array(
        z.object({
          location: shortText,
          original: boundedText,
          suggestion: boundedText,
          type: z.enum([
            "typo",
            "grammar",
            "connector",
            "expression",
            "redundancy",
          ]),
          reason: boundedText,
        })
      )
      .max(5),
    /**
     * 設問が求めた要求ごとの充足判定（監査 P1-12）。
     * 主題を外した答案でも文章力で点が残る問題を、独立した判定で拾う。
     */
    taskFulfillment: z.object({
      /** 設問に正面から答えているか */
      answersQuestion: z.boolean(),
      requirements: z
        .array(
          z.object({
            /** 設問が求めていること（「比較せよ」「三つ挙げよ」等） */
            requirement: shortText,
            status: z.enum(["met", "partial", "missing"]),
            /** met/partial の根拠となる答案内の一文。missing なら空文字 */
            evidence: boundedText,
          }),
        )
        .max(6),
      /** 外している場合に、何を書くべきだったかを一文で */
      note: boundedText,
    }),
    reportInsights: z
      .object({
        sourceComprehension: boundedText,
        summaryAccuracy: boundedText,
        citationAppropriateness: boundedText,
        analysisDepth: boundedText,
        sourceConnection: boundedText,
        misreadings: z.array(boundedText).max(8),
      })
      .nullable(),
  }),
});

export type EssayReviewOutput = z.infer<typeof EssayReviewOutputSchema>;
