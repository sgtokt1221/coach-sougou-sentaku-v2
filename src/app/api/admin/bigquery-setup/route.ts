import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  BQ_DATASET_NAME,
  getBigQueryClient,
  getBigQueryDataset,
} from "@/lib/bigquery/client";
import {
  TABLE_NAMES,
  ESSAY_SUBMISSIONS_SCHEMA,
  ESSAY_SUBMISSIONS_TABLE_META,
  INTERVIEW_SESSIONS_SCHEMA,
  INTERVIEW_SESSIONS_TABLE_META,
  STUDENT_SNAPSHOTS_SCHEMA,
  STUDENT_SNAPSHOTS_TABLE_META,
} from "@/lib/bigquery/schema";

/**
 * BigQuery dataset + 3 テーブルを冪等に作成する管理者用エンドポイント。
 *
 * superadmin 限定 (破壊的ではないが本番リソース作成のため最高権限を要求)。
 * 既存の dataset / テーブルは触らず、 存在しないもののみ作成する。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const client = getBigQueryClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "BigQuery client が初期化されていません。 GOOGLE_CLOUD_PROJECT_ID Secret を確認してください。",
      },
      { status: 500 },
    );
  }

  const result: {
    dataset: { name: string; created: boolean };
    tables: Record<string, { created: boolean; error?: string }>;
  } = {
    dataset: { name: BQ_DATASET_NAME, created: false },
    tables: {},
  };

  // 1. Dataset 作成 (= 既存なら何もしない)
  try {
    const dataset = client.dataset(BQ_DATASET_NAME);
    const [exists] = await dataset.exists();
    if (!exists) {
      await client.createDataset(BQ_DATASET_NAME, {
        location: "asia-northeast1", // 東京リージョン
      });
      result.dataset.created = true;
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `dataset 作成失敗: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  const dataset = getBigQueryDataset();
  if (!dataset) {
    return NextResponse.json(
      { error: "dataset ハンドル取得失敗" },
      { status: 500 },
    );
  }

  // 2. 各テーブル作成 (冪等)
  const tableSpecs = [
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

  for (const spec of tableSpecs) {
    try {
      const table = dataset.table(spec.name);
      const [exists] = await table.exists();
      if (exists) {
        result.tables[spec.name] = { created: false };
        continue;
      }
      await dataset.createTable(spec.name, {
        schema: spec.schema,
        ...spec.meta,
      });
      result.tables[spec.name] = { created: true };
    } catch (err) {
      result.tables[spec.name] = {
        created: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json(result);
}
