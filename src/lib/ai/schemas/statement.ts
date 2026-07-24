import { z } from "zod";

export const StatementDraftOutputSchema = z.object({
  structure: z.object({
    intro: z.string().max(5000),
    body: z.string().max(10000),
    strengths: z.string().max(5000),
    conclusion: z.string().max(5000),
  }),
  improvementSuggestions: z.array(z.string().max(1000)).max(5),
});

export type StatementDraftOutput = z.infer<typeof StatementDraftOutputSchema>;
