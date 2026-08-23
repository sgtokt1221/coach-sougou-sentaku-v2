import { z } from "zod";

/**
 * 書き直しドリルの判定。3件をまとめて1回で返させる。
 *
 * 上限は「壊れた出力を弾く歯止め」として置く（document-review.ts と同じ考え方）。
 * 厳しくしすぎると、判定自体は正しいのに parse が失敗してドリルが丸ごと落ちる。
 */
export const SentenceRewriteJudgeSchema = z.object({
  results: z
    .array(
      z.object({
        /** 何番目の問題か（0始まり） */
        index: z.number().int().min(0).max(9),
        /** 直せているか */
        ok: z.boolean(),
        /** なぜそう判定したか。生徒に見せる1〜2文 */
        comment: z.string().max(300),
        /** ok=false のときだけ。直し方の見本 */
        betterExample: z.string().max(300).nullable(),
      })
    )
    .max(10),
  /** 3件を通して見えた癖。空文字なら出さない */
  overall: z.string().max(300),
});

export type SentenceRewriteJudge = z.infer<typeof SentenceRewriteJudgeSchema>;
