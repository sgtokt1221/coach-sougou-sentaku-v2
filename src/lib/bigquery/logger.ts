import { getBigQueryClient } from "./client";
import type { BigQueryEssayLog, BigQueryInterviewLog } from "@/lib/types/analytics";

const DATASET = process.env.BQ_DATASET || "coach_analytics";

export async function logEssaySubmission(data: BigQueryEssayLog): Promise<void> {
  const client = getBigQueryClient();
  if (!client) {
    console.log("[BQ Mock] logEssaySubmission:", JSON.stringify(data));
    return;
  }

  try {
    await client.dataset(DATASET).table("essay_submissions").insert([data]);
  } catch (err) {
    console.error("[BQ] Failed to log essay submission:", err);
  }
}

export async function logInterviewSession(data: BigQueryInterviewLog): Promise<void> {
  const client = getBigQueryClient();
  if (!client) {
    console.log("[BQ Mock] logInterviewSession:", JSON.stringify(data));
    return;
  }

  try {
    await client.dataset(DATASET).table("interview_sessions").insert([data]);
  } catch (err) {
    console.error("[BQ] Failed to log interview session:", err);
  }
}
