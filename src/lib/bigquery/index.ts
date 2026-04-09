/**
 * BigQuery analytics pipeline – barrel export.
 *
 * Usage:
 *   import { logEssaySubmission, getEssayScoreTrends } from "@/lib/bigquery";
 */

// Client
export { getBigQueryClient, getBigQueryDataset, isBigQueryAvailable, BQ_DATASET_NAME } from "./client";

// Schema
export { TABLE_NAMES, type TableName } from "./schema";
export {
  ESSAY_SUBMISSIONS_SCHEMA,
  ESSAY_SUBMISSIONS_TABLE_META,
  INTERVIEW_SESSIONS_SCHEMA,
  INTERVIEW_SESSIONS_TABLE_META,
  STUDENT_SNAPSHOTS_SCHEMA,
  STUDENT_SNAPSHOTS_TABLE_META,
} from "./schema";

// Loggers
export { logEssaySubmission, logInterviewSession, logStudentSnapshot } from "./logger";
export type { BigQueryStudentSnapshotRow } from "./logger";

// Queries
export {
  getEssayScoreTrends,
  getInterviewScoreTrends,
  getWeaknessPatterns,
  getUniversityPerformance,
  getStudentComparison,
} from "./queries";
export type {
  QueryFilters,
  EssayScoreTrendRow,
  InterviewScoreTrendRow,
  WeaknessPatternRow,
  UniversityPerformanceRow,
  StudentComparisonResult,
} from "./queries";

// Setup
export { ensureBigQueryTables } from "./setup";
