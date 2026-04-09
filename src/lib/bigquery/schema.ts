/**
 * BigQuery table schema definitions for the analytics pipeline.
 *
 * Tables:
 *  - essay_submissions  (partitioned by submitted_at)
 *  - interview_sessions (partitioned by started_at)
 *  - student_snapshots  (partitioned by snapshot_date)
 *
 * These schemas are used by setup.ts to idempotently create tables,
 * and serve as the single source of truth for the column layout.
 */

import type { TableSchema, TableMetadata } from "@google-cloud/bigquery";

// ---------------------------------------------------------------------------
// essay_submissions
// ---------------------------------------------------------------------------

export const ESSAY_SUBMISSIONS_SCHEMA: TableSchema = {
  fields: [
    { name: "essay_id", type: "STRING", mode: "REQUIRED" },
    { name: "user_id", type: "STRING", mode: "REQUIRED" },
    { name: "university_id", type: "STRING", mode: "NULLABLE" },
    { name: "faculty_id", type: "STRING", mode: "NULLABLE" },
    { name: "submitted_at", type: "TIMESTAMP", mode: "NULLABLE" },

    // scores
    { name: "score_structure", type: "INT64", mode: "NULLABLE" },
    { name: "score_logic", type: "INT64", mode: "NULLABLE" },
    { name: "score_expression", type: "INT64", mode: "NULLABLE" },
    { name: "score_ap_alignment", type: "INT64", mode: "NULLABLE" },
    { name: "score_originality", type: "INT64", mode: "NULLABLE" },
    { name: "score_total", type: "INT64", mode: "NULLABLE" },

    // metadata
    { name: "word_count", type: "INT64", mode: "NULLABLE" },
    { name: "topic", type: "STRING", mode: "NULLABLE" },
    { name: "ocr_confidence", type: "FLOAT64", mode: "NULLABLE" },
    { name: "ai_model", type: "STRING", mode: "NULLABLE" },

    // tags
    { name: "weakness_tags", type: "STRING", mode: "REPEATED" },
    { name: "improvement_tags", type: "STRING", mode: "REPEATED" },
  ],
};

export const ESSAY_SUBMISSIONS_TABLE_META: Partial<TableMetadata> = {
  timePartitioning: {
    type: "DAY",
    field: "submitted_at",
  },
  clustering: {
    fields: ["university_id", "user_id"],
  },
};

// ---------------------------------------------------------------------------
// interview_sessions
// ---------------------------------------------------------------------------

export const INTERVIEW_SESSIONS_SCHEMA: TableSchema = {
  fields: [
    { name: "interview_id", type: "STRING", mode: "REQUIRED" },
    { name: "user_id", type: "STRING", mode: "REQUIRED" },
    { name: "university_id", type: "STRING", mode: "NULLABLE" },
    { name: "faculty_id", type: "STRING", mode: "NULLABLE" },
    { name: "started_at", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "duration_seconds", type: "INT64", mode: "NULLABLE" },
    { name: "mode", type: "STRING", mode: "NULLABLE" },

    // scores
    { name: "score_clarity", type: "INT64", mode: "NULLABLE" },
    { name: "score_ap_alignment", type: "INT64", mode: "NULLABLE" },
    { name: "score_enthusiasm", type: "INT64", mode: "NULLABLE" },
    { name: "score_specificity", type: "INT64", mode: "NULLABLE" },
    { name: "score_total", type: "INT64", mode: "NULLABLE" },

    // tags
    { name: "weakness_tags", type: "STRING", mode: "REPEATED" },
    { name: "improvement_tags", type: "STRING", mode: "REPEATED" },

    // metadata
    { name: "question_count", type: "INT64", mode: "NULLABLE" },
    { name: "ai_model", type: "STRING", mode: "NULLABLE" },

    // Phase 4 audio extensions
    { name: "has_audio_recording", type: "BOOL", mode: "NULLABLE" },
    { name: "audio_duration_seconds", type: "INT64", mode: "NULLABLE" },
    { name: "transcription_confidence", type: "FLOAT64", mode: "NULLABLE" },
    { name: "summary_generated", type: "BOOL", mode: "NULLABLE" },
  ],
};

export const INTERVIEW_SESSIONS_TABLE_META: Partial<TableMetadata> = {
  timePartitioning: {
    type: "DAY",
    field: "started_at",
  },
  clustering: {
    fields: ["university_id", "user_id"],
  },
};

// ---------------------------------------------------------------------------
// student_snapshots
// ---------------------------------------------------------------------------

export const STUDENT_SNAPSHOTS_SCHEMA: TableSchema = {
  fields: [
    { name: "user_id", type: "STRING", mode: "REQUIRED" },
    { name: "snapshot_date", type: "DATE", mode: "NULLABLE" },
    { name: "gpa", type: "FLOAT64", mode: "NULLABLE" },
    { name: "target_university_ids", type: "STRING", mode: "REPEATED" },
    { name: "essay_count", type: "INT64", mode: "NULLABLE" },
    { name: "interview_count", type: "INT64", mode: "NULLABLE" },
    { name: "avg_essay_score", type: "FLOAT64", mode: "NULLABLE" },
    { name: "avg_interview_score", type: "FLOAT64", mode: "NULLABLE" },
    { name: "top_weaknesses", type: "STRING", mode: "REPEATED" },
    { name: "overall_trend", type: "STRING", mode: "NULLABLE" },
    {
      name: "admission_results",
      type: "RECORD",
      mode: "REPEATED",
      fields: [
        { name: "university_id", type: "STRING", mode: "NULLABLE" },
        { name: "faculty_id", type: "STRING", mode: "NULLABLE" },
        { name: "result", type: "STRING", mode: "NULLABLE" },
      ],
    },
  ],
};

export const STUDENT_SNAPSHOTS_TABLE_META: Partial<TableMetadata> = {
  timePartitioning: {
    type: "DAY",
    field: "snapshot_date",
  },
  clustering: {
    fields: ["user_id"],
  },
};

// ---------------------------------------------------------------------------
// Table name constants
// ---------------------------------------------------------------------------

export const TABLE_NAMES = {
  ESSAY_SUBMISSIONS: "essay_submissions",
  INTERVIEW_SESSIONS: "interview_sessions",
  STUDENT_SNAPSHOTS: "student_snapshots",
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
