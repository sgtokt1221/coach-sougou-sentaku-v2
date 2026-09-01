import { z } from "zod";

export const SelfWriteJudgeSchema = z.object({
  items: z
    .array(
      z.object({
        ok: z.boolean(),
        comment: z.string().max(300),
      })
    )
    .max(8),
  overall: z.string().max(400),
});

export type SelfWriteJudgeOutput = z.infer<typeof SelfWriteJudgeSchema>;
