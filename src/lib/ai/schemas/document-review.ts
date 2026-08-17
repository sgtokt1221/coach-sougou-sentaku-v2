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
  improvements: z.array(z.string().max(1000)).max(5),
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
