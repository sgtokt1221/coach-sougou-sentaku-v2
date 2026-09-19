import { z } from "zod";

/**
 * 口頭試問型の小問集合を生成する構造化出力。
 *
 * 字数はここでは範囲だけを縛り、合計への合わせ込みはサーバー側
 * （`normalizeOralExamQuestionSet`）で行う。スキーマで合計一致を表現できないため、
 * モデルに任せると合計がずれたまま通る。
 */
export const OralExamQuestionSetOutputSchema = z.object({
  subQuestions: z
    .array(
      z.object({
        prompt: z.string().min(5).max(300),
        wordLimit: z.number().int().min(50).max(1200),
        aim: z.string().max(200),
      })
    )
    .min(1)
    .max(5),
});
