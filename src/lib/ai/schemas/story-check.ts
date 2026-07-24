import { z } from "zod";

const SourceRefSchema = z.object({
  type: z.enum(["document", "essay", "interview", "activity", "self-analysis"]),
  id: z.string().max(200),
  title: z.string().max(500),
  excerpt: z.string().max(1000),
});

export const StoryCheckOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  overallAssessment: z.string().max(3000),
  axisScores: z
    .array(
      z.object({
        axis: z.string().max(200),
        score: z.number().int().min(0).max(100),
        assessment: z.string().max(2000),
        evidence: z.array(z.string().max(1000)).max(5),
      })
    )
    .length(7),
  contradictions: z
    .array(
      z.object({
        severity: z.enum(["critical", "warning", "info"]),
        source1: SourceRefSchema,
        source2: SourceRefSchema,
        description: z.string().max(2000),
      })
    )
    .max(10),
  weakConnections: z
    .array(
      z.object({
        area: z.string().max(500),
        suggestion: z.string().max(2000),
      })
    )
    .max(10),
  storyStrengths: z.array(z.string().max(1000)).max(8),
  actionItems: z
    .array(
      z.object({
        priority: z.enum(["high", "medium", "low"]),
        action: z.string().max(2000),
        targetMaterial: z.string().max(500),
      })
    )
    .max(10),
});
