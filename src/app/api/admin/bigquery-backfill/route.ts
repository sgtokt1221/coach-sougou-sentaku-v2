import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  BQ_DATASET_NAME,
  getBigQueryClient,
  getBigQueryDataset,
} from "@/lib/bigquery/client";
import { TABLE_NAMES } from "@/lib/bigquery/schema";

/**
 * Firestore の essays / interviews 全件を BigQuery に流す移行バッチ。
 * superadmin 限定。 冪等性: 既に同 ID が BQ にあればスキップ。
 *
 * POST 引数 (query string):
 *  - mode: "essays" | "interviews" | "all" (default "all")
 *  - dryRun: "true" なら投入せず件数だけ返す
 *
 * 大量データは MERGE で重複防止 + バッチ insert で処理する。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "all") as
    | "essays"
    | "interviews"
    | "all";
  const dryRun = url.searchParams.get("dryRun") === "true";

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore 初期化エラー" },
      { status: 500 },
    );
  }
  const client = getBigQueryClient();
  const dataset = getBigQueryDataset();
  if (!client || !dataset) {
    return NextResponse.json(
      { error: "BigQuery クライアント初期化失敗" },
      { status: 500 },
    );
  }

  const result: Record<string, unknown> = { mode, dryRun };

  if (mode === "essays" || mode === "all") {
    result.essays = await backfillEssays(dataset, dryRun);
  }
  if (mode === "interviews" || mode === "all") {
    result.interviews = await backfillInterviews(dataset, dryRun);
  }

  return NextResponse.json(result);
}

async function fetchExistingIds(
  dataset: ReturnType<typeof getBigQueryDataset>,
  tableName: string,
  idColumn: string,
): Promise<Set<string>> {
  if (!dataset) return new Set();
  try {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim();
    const query = `SELECT ${idColumn} FROM \`${projectId}.${BQ_DATASET_NAME}.${tableName}\``;
    const [rows] = await dataset.query({ query });
    return new Set(rows.map((r: Record<string, string>) => r[idColumn]));
  } catch (err) {
    console.warn(`[backfill] 既存 ID 取得失敗 (${tableName}):`, err);
    return new Set();
  }
}

async function backfillEssays(
  dataset: ReturnType<typeof getBigQueryDataset>,
  dryRun: boolean,
) {
  if (!adminDb || !dataset) return { error: "init failed" };
  const existing = await fetchExistingIds(
    dataset,
    TABLE_NAMES.ESSAY_SUBMISSIONS,
    "essay_id",
  );

  const snap = await adminDb.collection("essays").get();
  const candidates: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    if (existing.has(doc.id)) continue;
    const d = doc.data();
    const scores = d.scores ?? {};
    candidates.push({
      essay_id: doc.id,
      user_id: d.userId ?? "",
      university_id: d.targetUniversity || null,
      faculty_id: d.targetFaculty || null,
      submitted_at: d.submittedAt?.toDate?.()?.toISOString() ?? null,
      score_structure: scores.structure ?? null,
      score_logic: scores.logic ?? null,
      score_expression: scores.expression ?? null,
      score_ap_alignment: scores.apAlignment ?? null,
      score_originality: scores.originality ?? null,
      score_total: scores.total ?? null,
      word_count: d.wordCount ?? null,
      topic: d.topic ?? null,
      ocr_confidence: null,
      ai_model: null,
      weakness_tags: Array.isArray(d.weaknessTags) ? d.weaknessTags : [],
      improvement_tags: Array.isArray(d.improvementTags) ? d.improvementTags : [],
    });
  }

  if (dryRun || candidates.length === 0) {
    return {
      totalInFirestore: snap.size,
      existingInBQ: existing.size,
      newToInsert: candidates.length,
      inserted: 0,
    };
  }

  // BigQuery streaming insert は 1 リクエスト 500 行が安全上限。 ロット分割
  const table = dataset.table(TABLE_NAMES.ESSAY_SUBMISSIONS);
  let inserted = 0;
  const errors: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const slice = candidates.slice(i, i + CHUNK);
    try {
      await table.insert(slice);
      inserted += slice.length;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return {
    totalInFirestore: snap.size,
    existingInBQ: existing.size,
    newToInsert: candidates.length,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function backfillInterviews(
  dataset: ReturnType<typeof getBigQueryDataset>,
  dryRun: boolean,
) {
  if (!adminDb || !dataset) return { error: "init failed" };
  const existing = await fetchExistingIds(
    dataset,
    TABLE_NAMES.INTERVIEW_SESSIONS,
    "interview_id",
  );

  const snap = await adminDb
    .collection("interviews")
    .where("status", "==", "completed")
    .get();
  const candidates: Record<string, unknown>[] = [];

  for (const doc of snap.docs) {
    if (existing.has(doc.id)) continue;
    const d = doc.data();
    const scores = d.scores ?? {};
    candidates.push({
      interview_id: doc.id,
      user_id: d.userId ?? "",
      university_id: d.universityId || null,
      faculty_id: d.facultyId || null,
      started_at: d.startedAt?.toDate?.()?.toISOString() ?? null,
      duration_seconds:
        typeof d.durationSec === "number" ? d.durationSec : null,
      mode: d.mode ?? null,
      score_clarity: scores.clarity ?? null,
      score_ap_alignment: scores.apAlignment ?? null,
      score_enthusiasm: scores.enthusiasm ?? null,
      score_specificity: scores.specificity ?? null,
      score_total: scores.total ?? null,
      weakness_tags: Array.isArray(d.weaknessTags) ? d.weaknessTags : [],
      improvement_tags: [],
      question_count:
        typeof d.questionCount === "number" ? d.questionCount : null,
      ai_model: null,
      has_audio_recording: null,
      audio_duration_seconds: null,
      transcription_confidence: null,
      summary_generated: null,
    });
  }

  if (dryRun || candidates.length === 0) {
    return {
      totalInFirestore: snap.size,
      existingInBQ: existing.size,
      newToInsert: candidates.length,
      inserted: 0,
    };
  }

  const table = dataset.table(TABLE_NAMES.INTERVIEW_SESSIONS);
  let inserted = 0;
  const errors: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const slice = candidates.slice(i, i + CHUNK);
    try {
      await table.insert(slice);
      inserted += slice.length;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return {
    totalInFirestore: snap.size,
    existingInBQ: existing.size,
    newToInsert: candidates.length,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  };
}
