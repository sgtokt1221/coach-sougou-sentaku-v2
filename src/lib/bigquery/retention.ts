/**
 * BigQueryデータ保持・削除ポリシー
 *
 * 個人情報保護法およびデータ最小化原則に基づき、
 * 一定期間後にデータを匿名化または削除する。
 */

// ───────────────────────────────────────────────
// 保持ポリシー定義
// ───────────────────────────────────────────────

export interface RetentionRule {
  tableName: string;
  retentionDays: number;
  retentionYears: number;
  description: string;
  action: "delete" | "anonymize";
}

const RETENTION_POLICIES: RetentionRule[] = [
  {
    tableName: "essay_submissions",
    retentionDays: 3 * 365, // 3年
    retentionYears: 3,
    description: "小論文提出データ（3年保持後に削除）",
    action: "delete",
  },
  {
    tableName: "interview_sessions",
    retentionDays: 3 * 365, // 3年
    retentionYears: 3,
    description: "面接セッションデータ（3年保持後に削除）",
    action: "delete",
  },
  {
    tableName: "student_snapshots",
    retentionDays: 5 * 365, // 5年
    retentionYears: 5,
    description: "生徒スナップショット（5年保持後に削除）",
    action: "delete",
  },
];

/**
 * データ保持ポリシーを取得する
 */
export function getRetentionPolicy(): RetentionRule[] {
  return [...RETENTION_POLICIES];
}

/**
 * 特定テーブルの保持ポリシーを取得
 */
export function getRetentionPolicyForTable(
  tableName: string
): RetentionRule | undefined {
  return RETENTION_POLICIES.find((p) => p.tableName === tableName);
}

// ───────────────────────────────────────────────
// アカウント削除時のデータマーキング
// ───────────────────────────────────────────────

export interface DeletionMark {
  studentId: string;
  markedAt: string;
  tables: string[];
  status: "pending" | "processing" | "completed";
}

/**
 * 生徒アカウント削除時に、BigQueryデータを匿名化対象としてマークする
 *
 * 実際のBigQueryへの操作はバッチジョブで実行されるため、
 * ここではマーキングレコードの生成のみ行う。
 *
 * @returns Firestoreに保存するべきDeletionMarkオブジェクト
 */
export function markForDeletion(studentId: string): DeletionMark {
  return {
    studentId,
    markedAt: new Date().toISOString(),
    tables: RETENTION_POLICIES.map((p) => p.tableName),
    status: "pending",
  };
}

// ───────────────────────────────────────────────
// 期限切れデータのクリーンアップクエリ
// ───────────────────────────────────────────────

export interface CleanupQuery {
  sql: string;
  tableName: string;
  retentionDays: number;
  description: string;
}

/**
 * 期限切れデータを削除するためのBigQueryクエリを生成する
 *
 * 注: 実際のBigQuery実行はバッチジョブ（Cloud Functions等）で行う。
 * この関数はクエリ文字列の生成のみ。
 *
 * @param tableName - 対象テーブル名
 * @param retentionDays - 保持日数（省略時はポリシーから取得）
 * @param projectId - BigQueryプロジェクトID
 * @param datasetId - BigQueryデータセットID
 */
export function cleanupExpiredData(
  tableName: string,
  retentionDays?: number,
  projectId: string = process.env.BIGQUERY_PROJECT_ID || "coachfor-project",
  datasetId: string = process.env.BIGQUERY_DATASET_ID || "analytics"
): CleanupQuery {
  const policy = getRetentionPolicyForTable(tableName);
  const effectiveRetentionDays = retentionDays ?? policy?.retentionDays ?? 365;

  // テーブルごとのタイムスタンプカラム名
  const timestampColumn = getTimestampColumn(tableName);

  const sql = `
-- ${tableName} の期限切れデータ削除
-- 保持期間: ${effectiveRetentionDays}日（${(effectiveRetentionDays / 365).toFixed(1)}年）
-- 実行日時: 自動生成
DELETE FROM \`${projectId}.${datasetId}.${tableName}\`
WHERE ${timestampColumn} < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${effectiveRetentionDays} DAY)
  `.trim();

  return {
    sql,
    tableName,
    retentionDays: effectiveRetentionDays,
    description: policy?.description ?? `${tableName}のクリーンアップ`,
  };
}

/**
 * 特定の生徒のデータを全テーブルから削除するクエリを生成
 *
 * @param anonymizedStudentId - 匿名化済みの生徒ID（SHA-256ハッシュ値）
 */
export function cleanupStudentData(
  anonymizedStudentId: string,
  projectId: string = process.env.BIGQUERY_PROJECT_ID || "coachfor-project",
  datasetId: string = process.env.BIGQUERY_DATASET_ID || "analytics"
): CleanupQuery[] {
  return RETENTION_POLICIES.map((policy) => ({
    sql: `
-- ${policy.tableName} から生徒データを削除
DELETE FROM \`${projectId}.${datasetId}.${policy.tableName}\`
WHERE user_id = '${anonymizedStudentId}'
    `.trim(),
    tableName: policy.tableName,
    retentionDays: policy.retentionDays,
    description: `${policy.tableName}から特定生徒のデータを削除`,
  }));
}

/**
 * 全テーブルのクリーンアップクエリを一括生成
 */
export function generateAllCleanupQueries(
  projectId?: string,
  datasetId?: string
): CleanupQuery[] {
  return RETENTION_POLICIES.map((policy) =>
    cleanupExpiredData(policy.tableName, policy.retentionDays, projectId, datasetId)
  );
}

// ───────────────────────────────────────────────
// ヘルパー
// ───────────────────────────────────────────────

function getTimestampColumn(tableName: string): string {
  switch (tableName) {
    case "essay_submissions":
      return "submitted_at";
    case "interview_sessions":
      return "started_at";
    case "student_snapshots":
      return "snapshot_at";
    default:
      return "created_at";
  }
}
