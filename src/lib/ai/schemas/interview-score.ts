import { z } from "zod";

/**
 * 面接評価の構造化出力スキーマ（監査 P1-1）。
 *
 * 面接だけ手書きJSONのパースで、範囲外の値も欠落も素通りしていた。
 * 小論文・書類と同じく Zod で検証する。
 *
 * モード別の軸（プレゼン/口頭試問/集団討論）は任意にする。1つのスキーマで
 * 全モードを受けるため。モードに合わない軸が返っても、保存側で
 * そのモードの軸だけを拾う。
 */
const score = z.number().min(0).max(10);
const shortText = z.string().max(500);
const boundedText = z.string().max(2000);

export const InterviewScoreOutputSchema = z.object({
  scores: z.object({
    clarity: score,
    apAlignment: score,
    enthusiasm: score,
    specificity: score,
    // プレゼン
    presentationStructure: score.optional(),
    dataEvidence: score.optional(),
    resourceConsistency: score.optional(),
    // 口頭試問
    knowledgeAccuracy: score.optional(),
    criticalThinking: score.optional(),
    // 集団討論
    collaboration: score.optional(),
    leadership: score.optional(),
    listening: score.optional(),
  }),
  feedback: z.object({
    overall: boundedText,
    goodPoints: z.array(shortText).max(10),
    improvements: z.array(boundedText).max(10),
    personalizedAdvice: z.array(boundedText).max(10),
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
            "other",
          ]),
          count: z.number().int().min(0).max(99),
          message: boundedText,
        }),
      )
      .max(8),
    improvementsSinceLast: z
      .array(
        z.object({
          area: shortText,
          before: boundedText,
          after: boundedText,
          message: boundedText,
        }),
      )
      .max(5),
  }),
  conversationSummary: z.object({
    keyWeaknesses: z.array(shortText).max(8),
    strongPoints: z.array(shortText).max(8),
    criticalMoments: z.array(boundedText).max(8),
    nextFocusAreas: z.array(shortText).max(8),
  }),
});

export type InterviewScoreOutput = z.infer<typeof InterviewScoreOutputSchema>;
