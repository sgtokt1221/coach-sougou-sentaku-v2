import { z } from "zod";

/**
 * 上限の考え方。
 *
 * ここの上限を厳しくすると、採点そのものは正しくても parse が例外を投げ、
 * 添削が丸ごと失敗する（生徒には「もう一度実行してください」としか出ない）。
 * 実際に「引用が3件のところ4件返した」「長い一文を location に丸ごと引用して
 * 200字を超えた」の2件で、まともな添削結果を捨てていた。
 *
 * そこでスキーマは「モデルが現実に返す範囲」を受け取れる広さにし、
 * 見せ方の都合（引用は3件まで等）は保存時に review-core.ts で整える。
 * 上限は、壊れた出力を弾くための歯止めとしてだけ置く。
 */
const score = z.number().int().min(0).max(10);

/** 根拠の引用。表示は3件までだが、多めに受けて保存時に切り詰める */
const evidence = z.array(z.string().max(600)).max(6);

/** 本文からの引用が入りうる欄。一文が長い書類だと引用も長くなる */
const quote = z.string().max(600);

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
        location: quote,
        /** 何が問題か */
        problem: z.string().max(600),
        /** 何をするか（手順） */
        action: z.string().max(800),
        /**
         * 直した文の例。本文の言葉を使って実際に書いて示す。
         * 長い一文を複数文に割る例では、そのぶん長くなる。
         * 本文を足す話ではなく削る・確認する類の指摘では null。
         */
        example: z.string().max(1200).nullable(),
      })
    )
    .max(6),
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
        location: quote,
        original: quote,
        suggestion: z.string().max(800),
        type: z.enum(["typo", "grammar", "connector", "expression", "redundancy"]),
        reason: z.string().max(600),
      })
    )
    .max(6),
});

export type DocumentReviewOutput = z.infer<typeof DocumentReviewOutputSchema>;
