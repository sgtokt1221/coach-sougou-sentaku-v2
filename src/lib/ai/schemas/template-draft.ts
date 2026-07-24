import { z } from "zod";

export const TemplateDraftOutputSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(200),
        content: z.string().max(10000),
      })
    )
    .max(12),
});

export type TemplateDraftOutput = z.infer<typeof TemplateDraftOutputSchema>;
