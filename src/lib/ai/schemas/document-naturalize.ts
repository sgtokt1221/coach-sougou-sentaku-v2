import { z } from "zod";

/** 自然な日本語に整えた結果。上限は広めに取り、表示の都合は保存側で整える */
export const DocumentNaturalizeOutputSchema = z.object({
  text: z.string().min(1).max(12000),
  changes: z.array(z.string().max(400)).max(10),
  questions: z.array(z.string().max(400)).max(4),
});
export type DocumentNaturalizeOutput = z.infer<typeof DocumentNaturalizeOutputSchema>;
