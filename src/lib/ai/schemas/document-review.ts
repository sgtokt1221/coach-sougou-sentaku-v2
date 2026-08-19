import { z } from "zod";

const score = z.number().int().min(0).max(10);
const evidence = z.array(z.string().max(500)).max(3);

export const DocumentReviewOutputSchema = z.object({
  apAlignmentScore: score.nullable(),
  apAlignmentAssessability: z.enum(["assessable", "insufficient_context"]),
  structureScore: score,
  originalityScore: score,
  /** 日本語の正確さと読みやすさ（document-review-v4 で追加） */
  expressionScore: score,
  overallFeedback: z.string().max(2000),
  /**
   * 改善点。v8 で文字列から構造化した。
   *
   * 文字列1本だと「具体性を高めましょう」で終わる指摘が混ざり、生徒が次に何を
   * すればよいか分からなかった。どこを・何が問題で・どう直すか・直した文の例、
   * の4つを別々に埋めさせることで、書き換え例の省略をスキーマで防ぐ。
   */
  improvements: z
    .array(
      z.object({
        /** どこの話か。本文の引用か「第2段落」「全体」など */
        location: z.string().max(200),
        /** 何が問題か */
        problem: z.string().max(400),
        /** 何をするか（手順） */
        action: z.string().max(600),
        /**
         * 直した文の例。本文の言葉を使って実際に書いて示す。
         * 本文を足す話ではなく削る・確認する類の指摘では null。
         */
        example: z.string().max(800).nullable(),
      })
    )
    .max(5),
  apSpecificNotes: z.string().max(1500),
  scoreEvidence: z.object({
    apAlignment: evidence,
    structure: evidence,
    originality: evidence,
  }),
  /**
   * 日本語の直し（赤ペン）。小論文添削にはあったが書類には無く、
   * 誤字や主述のねじれを指摘する経路がなかった。
   */
  languageCorrections: z
    .array(
      z.object({
        location: z.string().max(200),
        original: z.string().max(500),
        suggestion: z.string().max(500),
        type: z.enum(["typo", "grammar", "connector", "expression", "redundancy"]),
        reason: z.string().max(500),
      })
    )
    .max(5),
});

export type DocumentReviewOutput = z.infer<typeof DocumentReviewOutputSchema>;
