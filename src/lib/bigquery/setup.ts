/**
 * Idempotent BigQuery setup – creates dataset and tables if they don't exist.
 *
 * Can be called:
 *  1. As a standalone script: `npx tsx src/lib/bigquery/setup.ts`
 *  2. Programmatically at app startup via `ensureBigQueryTables()`
 *
 * All operations are safe to re-run; existing tables/datasets are left untouched.
 */

import { getBigQueryClient, BQ_DATASET_NAME } from "./client";
import {
  TABLE_NAMES,
  ESSAY_SUBMISSIONS_SCHEMA,
  ESSAY_SUBMISSIONS_TABLE_META,
  INTERVIEW_SESSIONS_SCHEMA,
  INTERVIEW_SESSIONS_TABLE_META,
  STUDENT_SNAPSHOTS_SCHEMA,
  STUDENT_SNAPSHOTS_TABLE_META,
} from "./schema";
import type { TableSchema, TableMetadata } from "@google-cloud/bigquery";

interface TableDefinition {
  name: string;
  schema: TableSchema;
  meta: Partial<TableMetadata>;
}

const TABLE_DEFINITIONS: TableDefinition[] = [
  {
    name: TABLE_NAMES.ESSAY_SUBMISSIONS,
    schema: ESSAY_SUBMISSIONS_SCHEMA,
    meta: ESSAY_SUBMISSIONS_TABLE_META,
  },
  {
    name: TABLE_NAMES.INTERVIEW_SESSIONS,
    schema: INTERVIEW_SESSIONS_SCHEMA,
    meta: INTERVIEW_SESSIONS_TABLE_META,
  },
  {
    name: TABLE_NAMES.STUDENT_SNAPSHOTS,
    schema: STUDENT_SNAPSHOTS_SCHEMA,
    meta: STUDENT_SNAPSHOTS_TABLE_META,
  },
];

/**
 * Create the analytics dataset (if missing) and all tables (if missing).
 * Returns true when BQ is available and setup succeeded, false otherwise.
 */
export async function ensureBigQueryTables(): Promise<boolean> {
  const client = getBigQueryClient();
  if (!client) {
    console.warn("[BQ Setup] BigQuery is not configured – skipping table setup.");
    return false;
  }

  try {
    // 1. Ensure dataset exists
    const dataset = client.dataset(BQ_DATASET_NAME);
    const [datasetExists] = await dataset.exists();
    if (!datasetExists) {
      console.log(`[BQ Setup] Creating dataset "${BQ_DATASET_NAME}" ...`);
      await client.createDataset(BQ_DATASET_NAME, {
        location: "asia-northeast1", // Tokyo region for low latency
      });
      console.log(`[BQ Setup] Dataset "${BQ_DATASET_NAME}" created.`);
    } else {
      console.log(`[BQ Setup] Dataset "${BQ_DATASET_NAME}" already exists.`);
    }

    // 2. Ensure tables exist
    for (const def of TABLE_DEFINITIONS) {
      const table = dataset.table(def.name);
      const [tableExists] = await table.exists();
      if (!tableExists) {
        console.log(`[BQ Setup] Creating table "${def.name}" ...`);
        await dataset.createTable(def.name, {
          schema: def.schema,
          ...def.meta,
        });
        console.log(`[BQ Setup] Table "${def.name}" created.`);
      } else {
        console.log(`[BQ Setup] Table "${def.name}" already exists.`);
      }
    }

    console.log("[BQ Setup] All tables are ready.");
    return true;
  } catch (err) {
    console.error("[BQ Setup] Setup failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// CLI entry-point
// ---------------------------------------------------------------------------
if (typeof require !== "undefined" && require.main === module) {
  ensureBigQueryTables()
    .then((ok) => {
      if (ok) {
        console.log("BigQuery setup completed successfully.");
      } else {
        console.log("BigQuery setup skipped (not configured).");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("BigQuery setup error:", err);
      process.exit(1);
    });
}
