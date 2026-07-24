import { z } from "zod";

const score = z.number().int().min(0).max(10);
const evidence = z.array(z.string().max(500)).max(3);

export const DocumentReviewOutputSchema = z.object({
  apAlignmentScore: score.nullable(),
  apAlignmentAssessability: z.enum(["assessable", "insufficient_context"]),
  structureScore: score,
  originalityScore: score,
  overallFeedback: z.string().max(2000),
  improvements: z.array(z.string().max(1000)).max(5),
  apSpecificNotes: z.string().max(1500),
  scoreEvidence: z.object({
    apAlignment: evidence,
    structure: evidence,
    originality: evidence,
  }),
});

export type DocumentReviewOutput = z.infer<typeof DocumentReviewOutputSchema>;
