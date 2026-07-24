import { z } from "zod";

const boundedText = z.string().max(2000);
const shortText = z.string().max(500);

export const EssayReviewOutputSchema = z.object({
  scores: z.object({
    structure: z.number().int().min(0).max(10),
    logic: z.number().int().min(0).max(10),
    expression: z.number().int().min(0).max(10),
    apAlignment: z.number().int().min(0).max(10),
    originality: z.number().int().min(0).max(10),
  }),
  feedback: z.object({
    overall: boundedText,
    goodPoints: z.array(shortText).max(5),
    priorityImprovement: boundedText,
    improvements: z.array(boundedText).max(5),
    nextChallenge: boundedText,
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
          count: z.number().int().min(1).max(99),
          message: boundedText,
        })
      )
      .max(8),
    improvementsSinceLast: z
      .array(
        z.object({
          area: shortText,
          before: boundedText,
          after: boundedText,
          message: boundedText,
        })
      )
      .max(5),
    topicInsights: z.object({
      background: boundedText,
      relatedThemes: z.array(shortText).max(5),
      deepDivePoints: z.array(boundedText).max(5),
      recommendedAngle: boundedText,
    }),
    languageCorrections: z
      .array(
        z.object({
          location: shortText,
          original: boundedText,
          suggestion: boundedText,
          type: z.enum([
            "typo",
            "grammar",
            "connector",
            "expression",
            "redundancy",
          ]),
          reason: boundedText,
        })
      )
      .max(5),
    reportInsights: z
      .object({
        sourceComprehension: boundedText,
        summaryAccuracy: boundedText,
        citationAppropriateness: boundedText,
        analysisDepth: boundedText,
        sourceConnection: boundedText,
        misreadings: z.array(boundedText).max(8),
      })
      .nullable(),
  }),
});

export type EssayReviewOutput = z.infer<typeof EssayReviewOutputSchema>;
