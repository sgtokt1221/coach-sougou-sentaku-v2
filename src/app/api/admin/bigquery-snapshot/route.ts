import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  BQ_DATASET_NAME,
  getBigQueryDataset,
} from "@/lib/bigquery/client";
import { TABLE_NAMES } from "@/lib/bigquery/schema";

/**
 * 全生徒のスナップショットを student_snapshots テーブルに書き出す日次バッチ。
 *
 * 認証方式:
 *  - 通常: superadmin ロールで POST
 *  - Cloud Scheduler 等の外部スケジューラ: x-cron-secret ヘッダー +
 *    `CRON_SECRET` 環境変数で認証 (= ユーザー認証無し許可)
 *
 * 1 日 1 回実行する想定 (= snapshot_date は実行日)。
 * 既に同 user_id + snapshot_date が存在する場合はスキップ (冪等)。
 */
export async function POST(request: NextRequest) {
  // 認証: superadmin OR cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const isCron = Boolean(
    cronSecret && expectedSecret && cronSecret === expectedSecret,
  );

  if (!isCron) {
    const auth = await requireRole(request, ["superadmin"]);
    if (auth instanceof NextResponse) return auth;
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore 初期化エラー" }, { status: 500 });
  }
  const dataset = getBigQueryDataset();
  if (!dataset) {
    return NextResponse.json({ error: "BQ 初期化エラー" }, { status: 500 });
  }

  // YYYY-MM-DD (UTC ベース、 日本時間考慮なら +9h 後の日付に)
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const snapshotDate = jst.toISOString().slice(0, 10);

  // 既存スナップショット: 同じ snapshot_date の user_id 一覧を取得 (冪等)
  let existingUids = new Set<string>();
  try {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim();
    const query = `
      SELECT user_id
      FROM \`${projectId}.${BQ_DATASET_NAME}.${TABLE_NAMES.STUDENT_SNAPSHOTS}\`
      WHERE snapshot_date = "${snapshotDate}"
    `;
    const [rows] = await dataset.query({ query });
    existingUids = new Set(
      rows.map((r: { user_id: string }) => r.user_id),
    );
  } catch (err) {
    console.warn("[snapshot] 既存スナップショット取得失敗:", err);
  }

  // 生徒一覧取得 (role = student)
  const usersSnap = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .get();

  const rows: Record<string, unknown>[] = [];
  for (const userDoc of usersSnap.docs) {
    if (existingUids.has(userDoc.id)) continue;
    const userData = userDoc.data();
    const uid = userDoc.id;

    const [essaysSnap, interviewsSnap, weaknessesSnap, examResultsSnap] =
      await Promise.all([
        adminDb.collection("essays").where("userId", "==", uid).get(),
        adminDb
          .collection("interviews")
          .where("userId", "==", uid)
          .where("status", "==", "completed")
          .get(),
        adminDb.collection(`users/${uid}/weaknesses`).get(),
        adminDb.collection(`users/${uid}/examResults`).get(),
      ]);

    const essayTotals = essaysSnap.docs
      .map((d) => d.data().scores?.total)
      .filter((t): t is number => typeof t === "number");
    const interviewTotals = interviewsSnap.docs
      .map((d) => d.data().scores?.total)
      .filter((t): t is number => typeof t === "number");

    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

    // 弱点 Top 5 (= count 降順)
    const weaknesses = weaknessesSnap.docs.map((d) => d.data());
    const topWeaknesses = [...weaknesses]
      .filter((w) => !w.resolved)
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 5)
      .map((w) => w.area ?? "")
      .filter(Boolean);

    // overall_trend: 直近 3 件 essay 平均 vs 前 3 件
    let overallTrend: string | null = null;
    if (essayTotals.length >= 6) {
      const sorted = [...essaysSnap.docs].sort((a, b) => {
        const ta = a.data().submittedAt?.toMillis?.() ?? 0;
        const tb = b.data().submittedAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      const recent = sorted.slice(0, 3).map((d) => d.data().scores?.total ?? 0);
      const prev = sorted.slice(3, 6).map((d) => d.data().scores?.total ?? 0);
      const diff = avg(recent) - avg(prev);
      overallTrend = diff >= 2 ? "improving" : diff <= -2 ? "declining" : "stagnant";
    }

    const admissionResults = examResultsSnap.docs.map((d) => {
      const r = d.data();
      return {
        university_id: r.universityId ?? "",
        faculty_id: r.facultyId ?? "",
        result: r.status ?? "pending",
      };
    });

    // signup 関連
    const signupDateRaw = userData.createdAt;
    const signupDate =
      signupDateRaw?.toDate?.() ??
      (typeof signupDateRaw === "string" ? new Date(signupDateRaw) : null);
    const signupDateStr = signupDate ? signupDate.toISOString().slice(0, 10) : null;
    const daysSinceSignup = signupDate
      ? Math.max(0, Math.floor((Date.now() - signupDate.getTime()) / 86400000))
      : null;

    rows.push({
      user_id: uid,
      snapshot_date: snapshotDate,
      gpa: typeof userData.gpa === "number" ? userData.gpa : null,
      target_university_ids: Array.isArray(userData.targetUniversities)
        ? userData.targetUniversities
        : [],
      essay_count: essaysSnap.size,
      interview_count: interviewsSnap.size,
      avg_essay_score: Math.round(avg(essayTotals) * 10) / 10,
      avg_interview_score: Math.round(avg(interviewTotals) * 10) / 10,
      top_weaknesses: topWeaknesses,
      overall_trend: overallTrend,
      signup_date: signupDateStr,
      days_since_signup: daysSinceSignup,
      school: typeof userData.school === "string" ? userData.school : null,
      organization_id:
        typeof userData.organizationId === "string"
          ? userData.organizationId
          : null,
      admission_results: admissionResults,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      snapshotDate,
      totalStudents: usersSnap.size,
      existingInBQ: existingUids.size,
      inserted: 0,
      message: "すでに本日分は処理済みです",
    });
  }

  const table = dataset.table(TABLE_NAMES.STUDENT_SNAPSHOTS);
  let inserted = 0;
  const errors: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    try {
      await table.insert(slice);
      inserted += slice.length;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({
    snapshotDate,
    totalStudents: usersSnap.size,
    existingInBQ: existingUids.size,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
