import { z } from "zod";

export const TemplateDraftOutputSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(200),
        /**
         * その段に入れる要素。本文は返させない。
         * 本文を返すと最終稿にAIの書いた文字列が残り、部分的に手を入れても
         * 生成物の印は消えるとは限らないため（本人が書く形にする）。
         */
        points: z.array(z.string().max(200)).min(1).max(6),
        /** 書き出す前に本人が答える問い。1つだけ */
        guidingQuestion: z.string().max(300),
      })
    )
    .max(12),
});

export type TemplateDraftOutput = z.infer<typeof TemplateDraftOutputSchema>;
