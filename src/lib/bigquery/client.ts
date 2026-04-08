/**
 * BigQuery client initialisation.
 *
 * Environment variables:
 *  - GOOGLE_CLOUD_PROJECT          – GCP project ID (required for BQ)
 *  - BQ_DATASET                    – Dataset name (default: "coach_analytics")
 *  - GOOGLE_APPLICATION_CREDENTIALS – Path to service-account key file (optional
 *                                     if running inside GCP with default credentials)
 *
 * In development without credentials the getter returns null and all
 * downstream code falls back to console logging.
 */

import { BigQuery, type Dataset } from "@google-cloud/bigquery";

let bigQueryClient: BigQuery | null = null;
let bigQueryDataset: Dataset | null = null;
let initWarned = false;

export const BQ_DATASET_NAME = process.env.BQ_DATASET || "coach_analytics";

/**
 * Return a configured BigQuery client, or null if credentials are unavailable.
 * The client is lazily created as a singleton.
 */
export function getBigQueryClient(): BigQuery | null {
  if (bigQueryClient) return bigQueryClient;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    if (!initWarned) {
      console.warn(
        "[BigQuery] GOOGLE_CLOUD_PROJECT is not set. " +
          "BigQuery logging is disabled – data will be logged to console instead."
      );
      initWarned = true;
    }
    return null;
  }

  try {
    bigQueryClient = new BigQuery({
      projectId,
      // GOOGLE_APPLICATION_CREDENTIALS is picked up automatically by the SDK
      // when the env var is set, so no explicit keyFilename is needed.
    });
    return bigQueryClient;
  } catch (err) {
    console.error("[BigQuery] Failed to initialise client:", err);
    return null;
  }
}

/**
 * Convenience helper – returns the analytics Dataset handle (or null).
 */
export function getBigQueryDataset(): Dataset | null {
  if (bigQueryDataset) return bigQueryDataset;

  const client = getBigQueryClient();
  if (!client) return null;

  bigQueryDataset = client.dataset(BQ_DATASET_NAME);
  return bigQueryDataset;
}

/**
 * Check whether BigQuery is available and configured.
 */
export function isBigQueryAvailable(): boolean {
  return getBigQueryClient() !== null;
}
