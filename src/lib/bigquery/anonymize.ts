import { createHash } from "crypto";

/**
 * BigQuery向けデータ匿名化ユーティリティ
 *
 * 個人情報保護のため、BigQueryに投入するデータからPIIを除去し、
 * k-匿名性を確保する。
 */

const ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT || "coachfor-default-salt-change-in-production";

// ───────────────────────────────────────────────
// 1. studentId の匿名化（SHA-256ハッシュ）
// ───────────────────────────────────────────────

/**
 * 学生IDをSHA-256ハッシュで匿名化する
 * saltを付与して元IDの推測を困難にする
 */
export function anonymizeStudentId(studentId: string): string {
  return createHash("sha256")
    .update(`${ANONYMIZATION_SALT}:${studentId}`)
    .digest("hex");
}

// ───────────────────────────────────────────────
// 2. レコードの匿名化（PII除去）
// ───────────────────────────────────────────────

/** PII（個人識別情報）フィールド名のリスト */
const PII_FIELDS = new Set([
  "displayName",
  "name",
  "email",
  "phoneNumber",
  "phone",
  "address",
  "photoURL",
  "school",
  "managedBy",
]);

/**
 * レコードからPIIフィールドを除去し、studentId/userId をハッシュ化する
 */
export function anonymizeRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const anonymized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    // PIIフィールドは除外
    if (PII_FIELDS.has(key)) continue;

    // studentId / userId / user_id をハッシュ化
    if (
      (key === "studentId" || key === "userId" || key === "user_id") &&
      typeof value === "string"
    ) {
      anonymized[key] = anonymizeStudentId(value);
      continue;
    }

    anonymized[key] = value;
  }

  return anonymized;
}

// ───────────────────────────────────────────────
// 3. k-匿名性の適用
// ───────────────────────────────────────────────

/**
 * k-匿名性を強制する
 *
 * 指定したgroupByフィールドでレコードをグループ化し、
 * グループ内のレコード数がk未満のグループを抑制（除外）する。
 *
 * @param records - 匿名化済みレコード配列
 * @param k - 最小グループサイズ（デフォルト: 5）
 * @param groupByFields - グループ化に使うフィールド名（省略時: university_id, faculty_id）
 * @returns k-匿名性を満たすレコードのみの配列
 */
export function enforceKAnonymity<T extends Record<string, unknown>>(
  records: T[],
  k: number = 5,
  groupByFields: string[] = ["university_id", "faculty_id"]
): T[] {
  // グループキーを生成
  const groups = new Map<string, T[]>();

  for (const record of records) {
    const groupKey = groupByFields
      .map((field) => String(record[field] ?? ""))
      .join("|");

    const group = groups.get(groupKey);
    if (group) {
      group.push(record);
    } else {
      groups.set(groupKey, [record]);
    }
  }

  // k未満のグループを除外
  const result: T[] = [];
  for (const [, group] of groups) {
    if (group.length >= k) {
      result.push(...group);
    }
  }

  return result;
}

// ───────────────────────────────────────────────
// 4. BigQuery投入用パイプライン
// ───────────────────────────────────────────────

export type BigQueryRecordType = "essay" | "interview" | "snapshot";

interface EssayBQRecord {
  essay_id: string;
  user_id: string;
  university_id: string;
  faculty_id: string;
  submitted_at: string;
  score_structure: number;
  score_logic: number;
  score_expression: number;
  score_ap_alignment: number;
  score_originality: number;
  score_total: number;
  word_count: number;
  topic: string;
  weakness_tags: string[];
  improvement_tags: string[];
}

interface InterviewBQRecord {
  interview_id: string;
  user_id: string;
  university_id: string;
  faculty_id: string;
  started_at: string;
  duration_seconds: number;
  mode: string;
  score_clarity: number;
  score_ap_alignment: number;
  score_enthusiasm: number;
  score_specificity: number;
  score_total: number;
  weakness_tags: string[];
  question_count: number;
}

interface SnapshotBQRecord {
  user_id: string;
  snapshot_at: string;
  grade: number | null;
  gpa_range: string | null;
  target_university_count: number;
  essay_count: number;
  interview_count: number;
  avg_essay_score: number | null;
  avg_interview_score: number | null;
  active_weakness_count: number;
  document_completion_rate: number | null;
}

/**
 * BigQuery投入用の完全匿名化パイプライン
 *
 * 1. PIIフィールドの除去
 * 2. user_id のハッシュ化
 * 3. タイプ固有の追加匿名化
 */
export function prepareForBigQuery(
  record: Record<string, unknown>,
  type: BigQueryRecordType
): Record<string, unknown> {
  // 基本匿名化（PII除去 + ID ハッシュ）
  const anonymized = anonymizeRecord(record);

  // タイプ固有の処理
  switch (type) {
    case "essay": {
      // topicフィールドから個人名を除去（万が一含まれる場合）
      if (typeof anonymized.topic === "string") {
        anonymized.topic = sanitizeText(anonymized.topic);
      }
      break;
    }
    case "interview": {
      // 追加の匿名化が必要なフィールドはなし
      break;
    }
    case "snapshot": {
      // GPAは範囲にまるめる（re-identification防止）
      if (typeof anonymized.gpa === "number") {
        anonymized.gpa_range = roundGpaToRange(anonymized.gpa as number);
        delete anonymized.gpa;
      }
      break;
    }
  }

  return anonymized;
}

// ───────────────────────────────────────────────
// ヘルパー関数
// ───────────────────────────────────────────────

/**
 * テキストから潜在的な個人情報パターンを除去
 */
function sanitizeText(text: string): string {
  // メールアドレスを除去
  let sanitized = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]");
  // 電話番号パターンを除去
  sanitized = sanitized.replace(/0\d{1,4}-?\d{1,4}-?\d{3,4}/g, "[PHONE]");
  return sanitized;
}

/**
 * GPAを範囲文字列にまるめる（k-匿名性向上）
 */
function roundGpaToRange(gpa: number): string {
  if (gpa >= 4.5) return "4.5-5.0";
  if (gpa >= 4.0) return "4.0-4.4";
  if (gpa >= 3.5) return "3.5-3.9";
  if (gpa >= 3.0) return "3.0-3.4";
  if (gpa >= 2.5) return "2.5-2.9";
  return "2.0-2.4";
}

export type { EssayBQRecord, InterviewBQRecord, SnapshotBQRecord };
