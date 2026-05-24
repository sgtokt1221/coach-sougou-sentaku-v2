import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  BQ_DATASET_NAME,
  getBigQueryProjectId,
  getBigQueryDataset,
} from "@/lib/bigquery/client";
import { TABLE_NAMES } from "@/lib/bigquery/schema";

/**
 * BigQuery 疎通確認エンドポイント (admin / superadmin 限定)。
 *
 * 本番デプロイ後に curl 等で叩いて、 BigQuery にデータが流れる状態にあるかを
 * 一目で判定する。 各段階を分けて返すので、 どこで失敗しているかが分かる。
 *
 * 返却 JSON:
 *  - env.projectId, env.dataset       : 環境変数取得状況
 *  - dataset.exists, dataset.error    : dataset 接続テスト
 *  - tables[name].exists, rowCount24h : 各テーブルの存在 + 直近 24h 件数
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const result: Record<string, unknown> = {
    env: {
      projectId: getBigQueryProjectId() ?? null,
      dataset: BQ_DATASET_NAME,
      hasCredentials: Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          process.env.GOOGLE_CLOUD_PROJECT_ID ||
          process.env.GOOGLE_CLOUD_PROJECT,
      ),
    },
  };

  const dataset = getBigQueryDataset();
  if (!dataset) {
    result.dataset = {
      exists: false,
      error: "BigQuery client が初期化されていません (環境変数未設定 or 認証失敗)",
    };
    return NextResponse.json(result);
  }

  // dataset 存在確認
  try {
    const [datasetExists] = await dataset.exists();
    result.dataset = { exists: datasetExists };
    if (!datasetExists) {
      result.hint = `dataset "${BQ_DATASET_NAME}" が BigQuery 上に存在しません。 setup スクリプト or BQ コンソールで作成してください。`;
      return NextResponse.json(result);
    }
  } catch (err) {
    result.dataset = {
      exists: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(result);
  }

  // 各テーブル: 存在 + 直近 24h 挿入件数
  const tableNames = Object.values(TABLE_NAMES);
  const tables: Record<string, unknown> = {};
  for (const name of tableNames) {
    const t = dataset.table(name);
    try {
      const [exists] = await t.exists();
      if (!exists) {
        tables[name] = { exists: false };
        continue;
      }
      // 直近 24h 件数: テーブル別の日時カラム名を渡す
      const timeCol =
        name === TABLE_NAMES.ESSAY_SUBMISSIONS
          ? "submitted_at"
          : name === TABLE_NAMES.INTERVIEW_SESSIONS
            ? "started_at"
            : "snapshot_date";
      const projectId = getBigQueryProjectId();
      const query = `
        SELECT COUNT(*) AS cnt
        FROM \`${projectId}.${BQ_DATASET_NAME}.${name}\`
        WHERE ${timeCol} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      `;
      try {
        const [rows] = await dataset.query({ query });
        const cnt = rows[0]?.cnt ?? 0;
        tables[name] = { exists: true, rowCount24h: Number(cnt) };
      } catch (queryErr) {
        tables[name] = {
          exists: true,
          rowCount24h: null,
          queryError:
            queryErr instanceof Error ? queryErr.message : String(queryErr),
        };
      }
    } catch (err) {
      tables[name] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  result.tables = tables;

  return NextResponse.json(result);
}
