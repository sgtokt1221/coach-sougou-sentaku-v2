import { z } from "zod";

const shortText = z.string().max(500);
const boundedText = z.string().max(2000);

/**
 * ちょこ添削（1段落だけ書く練習）の構造化出力スキーマ。
 *
 * 以前は手書きJSONをテキストで返させ、正規表現で切り出して JSON.parse し、
 * 失敗したら jsonrepair で補修していた。小論文添削・スキルチェックで実際に
 * 本番のパース失敗（Unterminated string 系）が出たのと同じ経路なので、
 * 添削系で最後に残っていたここも構造化出力へ移す。
 *
 * total はモデルに計算させず、呼び出し側で3軸を合計する。
 */
export const ChocoReviewOutputSchema = z.object({
  scores: z.object({
    logic: z.number().int().min(0).max(10),
    coherence: z.number().int().min(0).max(10),
    expression: z.number().int().min(0).max(10),
  }),
  feedback: z.object({
    overall: boundedText,
    goodPoints: z.array(shortText).max(4),
    improvements: z.array(shortText).max(4),
    languageCorrections: z
      .array(
        z.object({
          location: shortText,
          original: shortText,
          suggestion: shortText,
          type: z.enum([
            "typo",
            "grammar",
            "connector",
            "expression",
            "redundancy",
          ]),
          reason: shortText,
        })
      )
      .max(5),
    weaknessTags: z.array(shortText).max(5),
    nextTip: shortText,
  }),
});

export type ChocoReviewOutput = z.infer<typeof ChocoReviewOutputSchema>;
