import { z } from "zod";

/**
 * 身だしなみチェックの構造化出力。
 *
 * 以前は「JSONだけを返せ」と頼み、本文から正規表現で `{...}` を抜いて
 * JSON.parse していた。max_tokens が512しかなく、指摘が数件出ると本文が
 * 途中で切れて閉じ括弧が無くなり、500 になっていた（画面には
 * 「身だしなみチェックに失敗しました」としか出ない）。
 */
export const AppearanceCheckOutputSchema = z.object({
  score: z.number().int().min(0).max(10),
  issues: z
    .array(
      z.object({
        category: z.enum([
          "clothing",
          "hair",
          "grooming",
          "posture",
          "object",
          "background",
          "lighting",
        ]),
        severity: z.enum(["critical", "warning", "info"]),
        description: z.string().max(300),
      })
    )
    .max(12),
  advice: z.string().max(600),
});
