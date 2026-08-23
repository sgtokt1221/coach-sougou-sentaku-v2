import { z } from "zod";

/**
 * テーマ深掘りの構造化出力。
 *
 * 上限は「壊れた出力を弾く歯止め」として置く（document-review.ts と同じ考え方）。
 * ここを厳しくすると、中身は正しいのに parse で落ちて機能が丸ごと失敗する。
 *
 * 採点（essay-review）の上限が2000字だったために深掘りが短くなっていたので、
 * 読み物として成立する長さを取る。
 */
const paragraph = z.string().max(3000);
const line = z.string().max(600);

export const EssayDeepDiveOutputSchema = z.object({
  issue: line,
  conflict: paragraph,
  positions: z
    .array(
      z.object({
        label: line,
        claim: paragraph,
        grounds: paragraph,
        weakness: paragraph,
      })
    )
    .max(4),
  facts: z.array(z.object({ title: line, detail: paragraph })).max(6),
  misconceptions: z
    .array(z.object({ belief: line, correction: paragraph }))
    .max(4),
  angles: z.array(z.object({ angle: line, howToUse: paragraph })).max(4),
  furtherQuestions: z.array(line).max(5),
});

export type EssayDeepDiveOutput = z.infer<typeof EssayDeepDiveOutputSchema>;
