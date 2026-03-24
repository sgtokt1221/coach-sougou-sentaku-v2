import { BigQuery } from "@google-cloud/bigquery";

let bigQueryClient: BigQuery | null = null;

export function getBigQueryClient(): BigQuery | null {
  if (bigQueryClient) return bigQueryClient;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    return null;
  }

  bigQueryClient = new BigQuery({ projectId });
  return bigQueryClient;
}
