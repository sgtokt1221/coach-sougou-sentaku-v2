/**
 * BigQuery logging functions.
 *
 * Each logger inserts a row into the corresponding BigQuery table.
 * When BigQuery is not configured (no credentials / dev mode), data is
 * logged to the console instead so the app never crashes.
 *
 * All functions are designed to be called fire-and-forget:
 *   void logEssaySubmission({ ... });
 */

import { getBigQueryDataset } from "./client";
import { TABLE_NAMES } from "./schema";
import type { BigQueryEssayLog, BigQueryInterviewLog } from "@/lib/types/analytics";

// ---------------------------------------------------------------------------
// Student snapshot row shape (not in analytics.ts yet, defined inline here)
// ---------------------------------------------------------------------------
export interface BigQueryStudentSnapshotRow {
  user_id: string;
  snapshot_date: string; // YYYY-MM-DD
  gpa?: number | null;
  target_university_ids?: string[];
  essay_count: number;
  interview_count: number;
  avg_essay_score: number;
  avg_interview_score: number;
  top_weaknesses: string[];
  overall_trend?: string; // "improving" | "stagnant" | "declining"
  admission_results?: Array<{
    university_id: string;
    faculty_id: string;
    result: string; // "passed" | "failed" | "pending"
  }>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DATASET = process.env.BQ_DATASET || "coach_analytics";

/**
 * Generic row insert with error handling.
 * Falls back to console.log when BigQuery is unavailable.
 */
async function insertRow(
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Record<string, any>,
  label: string
): Promise<void> {
  const dataset = getBigQueryDataset();

  if (!dataset) {
    console.log(`[BQ Mock] ${label}:`, JSON.stringify(row));
    return;
  }

  try {
    await dataset.table(tableName).insert([row]);
  } catch (err) {
    // BigQuery streaming insert can fail with partial errors.
    // Log but never throw so the caller is unaffected.
    console.error(`[BQ] Failed to insert into ${DATASET}.${tableName}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Public loggers
// ---------------------------------------------------------------------------

/**
 * Log a completed essay review to BigQuery.
 */
export async function logEssaySubmission(data: BigQueryEssayLog): Promise<void> {
  await insertRow(
    TABLE_NAMES.ESSAY_SUBMISSIONS,
    {
      essay_id: data.essay_id,
      user_id: data.user_id,
      university_id: data.university_id || null,
      faculty_id: data.faculty_id || null,
      submitted_at: data.submitted_at
        ? new Date(data.submitted_at).toISOString()
        : new Date().toISOString(),
      score_structure: data.score_structure,
      score_logic: data.score_logic,
      score_expression: data.score_expression,
      score_ap_alignment: data.score_ap_alignment,
      score_originality: data.score_originality,
      score_total: data.score_total,
      word_count: data.word_count,
      topic: data.topic || null,
      ocr_confidence: null, // populated if available in future
      ai_model: null,
      weakness_tags: data.weakness_tags ?? [],
      improvement_tags: data.improvement_tags ?? [],
    },
    "logEssaySubmission"
  );
}

/**
 * Log a completed interview session to BigQuery.
 */
export async function logInterviewSession(
  data: BigQueryInterviewLog
): Promise<void> {
  await insertRow(
    TABLE_NAMES.INTERVIEW_SESSIONS,
    {
      interview_id: data.interview_id,
      user_id: data.user_id,
      university_id: data.university_id || null,
      faculty_id: data.faculty_id || null,
      started_at: data.started_at
        ? new Date(data.started_at).toISOString()
        : new Date().toISOString(),
      duration_seconds: data.duration_seconds,
      mode: data.mode || null,
      score_clarity: data.score_clarity,
      score_ap_alignment: data.score_ap_alignment,
      score_enthusiasm: data.score_enthusiasm,
      score_specificity: data.score_specificity,
      score_total: data.score_total,
      weakness_tags: data.weakness_tags ?? [],
      improvement_tags: [],
      question_count: data.question_count,
      ai_model: null,
      has_audio_recording: null,
      audio_duration_seconds: null,
      transcription_confidence: null,
      summary_generated: null,
    },
    "logInterviewSession"
  );
}

/**
 * Log a student profile snapshot to BigQuery.
 * Typically called by a periodic batch job or admin action.
 */
export async function logStudentSnapshot(
  data: BigQueryStudentSnapshotRow
): Promise<void> {
  await insertRow(
    TABLE_NAMES.STUDENT_SNAPSHOTS,
    {
      user_id: data.user_id,
      snapshot_date: data.snapshot_date, // YYYY-MM-DD
      gpa: data.gpa ?? null,
      target_university_ids: data.target_university_ids ?? [],
      essay_count: data.essay_count,
      interview_count: data.interview_count,
      avg_essay_score: data.avg_essay_score,
      avg_interview_score: data.avg_interview_score,
      top_weaknesses: data.top_weaknesses ?? [],
      overall_trend: data.overall_trend ?? null,
      admission_results: data.admission_results ?? [],
    },
    "logStudentSnapshot"
  );
}
