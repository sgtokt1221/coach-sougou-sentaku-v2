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
      /** 設問に正面から答えているか（subjectMatch === "same" と一致させる） */
      answersQuestion: z.boolean(),
      /**
       * 答案の中心的な話題と、設問の主題の関係。
       * same=同一 / narrower=主題の一部に限定 / different=別の話題
       * ブール1つだと実行ごとに判定が揺れたため、3択で明示させる。
       */
      subjectMatch: z.enum(["same", "narrower", "different"]),
      requirements: z
        .array(
          z.object({
            /** 設問が求めていること（「比較せよ」「三つ挙げよ」等） */
            requirement: shortText,
            status: z.enum(["met", "partial", "missing"]),
            /** met/partial の根拠となる答案内の一文。missing なら空文字 */
            evidence: boundedText,
          })
        )
        .max(6),
      /** 外している場合に、何を書くべきだったかを一文で */
      note: boundedText,
    }),
    /**
     * 答案が持ち出した事実主張の確認状態（監査 P1-11）。
     * 架空の固有名詞・統計が「具体的」として加点されるのを防ぐ。
     */
    claimChecks: z
      .array(
        z.object({
          /** 答案から抜き出した主張。原文の表現をそのまま使う */
          claim: shortText,
          type: z.enum([
            "person",
            "organization",
            "law_or_policy",
            "research_or_book",
            "statistic",
            "date",
            "quotation",
            "personal_fact",
          ]),
          /**
           * verified: 与えられた資料で裏が取れる
           * contradicted: 資料と食い違う
           * unverified: 資料が無く確認できない（外部知識で断定しない）
           * not_checkable: 本人の経験など、そもそも外から確認できない
           */
          status: z.enum([
            "verified",
            "contradicted",
            "unverified",
            "not_checkable",
          ]),
          /** verified/contradicted の根拠となる資料内の一文。無ければ空 */
          evidence: boundedText,
        })
      )
      .max(6),
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
