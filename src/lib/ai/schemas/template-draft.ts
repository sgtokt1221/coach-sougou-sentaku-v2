import { z } from "zod";

export const TemplateDraftOutputSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(200),
        /**
         * その段の本文。そのまま提出できる完全な文章で返す（空欄を残さない）。
         * 以前は要素（points）と問いだけを返し、本文は生徒が書く形にしていたが、
         * 生徒は設定した字数の完全な文章を求めている（2026-10-04 方針変更）。
         * 上限は文法のサイズを抑えるためではなく、受け取り後の Zod 検査で効くので広めに取る。
         */
        text: z.string().max(4000),
      })
    )
    .max(12),
});

export type TemplateDraftOutput = z.infer<typeof TemplateDraftOutputSchema>;
