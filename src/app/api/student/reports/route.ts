import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { toDateSafe, toIsoString } from "@/lib/firebase/timestamp";
import {
  computeEssayStats,
  computeInterviewStats,
} from "@/lib/growth/report";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * GET /api/student/reports
 *
 * 認証ユーザー自身の成長レポート一覧を返す。
 * `sharedWithStudent === false` のレポートは除外 (講師が下書き状態で
 * 公開を保留しているケース)。
 *
 * 管理者 API (`/api/admin/reports/[studentId]`) とは別経路。
 * 認可ロジックが異なる (生徒は自分のみ閲覧可) ため独立させる。
 */
export async function GET(request: NextRequest) {
  let step = "start";

  try {
    step = "auth";
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    step = "init_check";
    if (!adminDb) {
      return NextResponse.json(
        {
          error: "Firestore に接続できません",
          detail: "adminDb is not initialized",
          step,
        },
        { status: 500 }
      );
    }

    step = "query_reports";
    // generatedAt desc で limit 取得。limit はクエリパラメータで指定可
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      100,
    );

    let snap;
    try {
      snap = await adminDb
        .collection(`users/${auth.uid}/growthReports`)
        .orderBy("generatedAt", "desc")
        .limit(limit)
        .get();
    } catch (indexErr) {
      console.warn("[student/reports] orderBy index missing, fallback to JS sort:", indexErr);
      const all = await adminDb
        .collection(`users/${auth.uid}/growthReports`)
        .get();
      // toDateSafe で全形式 (Date / string / Timestamp / { _seconds }) を正規化
      // 古いレポートで toDate() が失敗して 0 にフォールバックして順序が崩れていた
      const docs = all.docs.slice().sort((a, b) => {
        const ta = toDateSafe(a.data().generatedAt)?.getTime() ?? 0;
        const tb = toDateSafe(b.data().generatedAt)?.getTime() ?? 0;
        return tb - ta;
      }).slice(0, limit);
      snap = { docs };
    }

    step = "map_results";
    const reports: GrowthReport[] = snap.docs
      .map((d) => {
        const data = d.data();
        const editedAtIso = toIsoString(data.editedAt);
        return {
          id: d.id,
          studentId: auth.uid,
          studentName: typeof data.studentName === "string" ? data.studentName : "",
          period: data.period,
          startDate: toIsoString(data.startDate) ?? "",
          endDate: toIsoString(data.endDate) ?? "",
          generatedAt: toIsoString(data.generatedAt) ?? new Date().toISOString(),
          essayStats: data.essayStats,
          interviewStats: data.interviewStats,
          weaknessProgress: Array.isArray(data.weaknessProgress)
            ? data.weaknessProgress
            : [],
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations.filter(
                (r: unknown): r is string => typeof r === "string",
              )
            : [],
          overallAssessment:
            typeof data.overallAssessment === "string" ? data.overallAssessment : "",
          sessionSummary: data.sessionSummary,
          teacherComment:
            typeof data.teacherComment === "string" ? data.teacherComment : undefined,
          practiceQuestions: Array.isArray(data.practiceQuestions)
            ? data.practiceQuestions
            : undefined,
          editedBy: typeof data.editedBy === "string" ? data.editedBy : undefined,
          ...(editedAtIso ? { editedAt: editedAtIso } : {}),
          sharedWithStudent: data.sharedWithStudent,
        } as GrowthReport;
      })
      // 公開オフは除外。undefined は「未設定 = デフォルト公開」とみなす
      .filter((r) => r.sharedWithStudent !== false);

    // バックフィル: 古いレポートの startDate/endDate と categoryAverages を補完
    // 期間が空ならば generatedAt から推定。期間が確定したら essays/interviews を集計。
    // 結果は Firestore にも書き戻し (次回からキャッシュ)
    step = "backfill_report";
    await Promise.all(
      reports.map((r) => backfillReport(auth.uid, r).catch((e) => {
        console.warn(
          `[student/reports] backfill failed for ${r.id}:`,
          e instanceof Error ? e.message : e,
        );
      })),
    );

    return NextResponse.json(reports);
  } catch (error) {
    console.error(`[student/reports GET] step=${step} error:`, error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "レポート一覧の取得に失敗しました", detail, step },
      { status: 500 }
    );
  }
}

/**
 * 古いレポートに対するバックフィル:
 * - startDate / endDate が空なら generatedAt から推定して補完
 * - count > 0 かつ categoryAverages 未設定なら期間内 essays/interviews を集計
 *
 * `report` を mutate しつつ Firestore にも書き戻す (fire-and-forget)。
 * 一度補完されたら次回以降はキャッシュから読まれるので計算ゼロ。
 *
 * 失敗時は呼び出し側で catch されるので UI 表示には影響しない。
 */
async function backfillReport(
  userId: string,
  report: GrowthReport,
): Promise<void> {
  if (!adminDb) return;

  // 1. 期間を確定 (Firestore 値 → なければ generatedAt から推定)
  let startDate = toDateSafe(report.startDate);
  let endDate = toDateSafe(report.endDate);
  const needsPeriod = !startDate || !endDate;
  if (needsPeriod) {
    const generatedAt = toDateSafe(report.generatedAt) ?? new Date();
    endDate = generatedAt;
    startDate = new Date(generatedAt);
    if (report.period === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }
    // レスポンス用にも反映
    report.startDate = startDate.toISOString();
    report.endDate = endDate.toISOString();
  }

  const needsEssay =
    report.essayStats &&
    report.essayStats.count > 0 &&
    !report.essayStats.categoryAverages;
  const needsInterview =
    report.interviewStats &&
    report.interviewStats.count > 0 &&
    !report.interviewStats.categoryAverages;

  if (!needsPeriod && !needsEssay && !needsInterview) return;
  if (!startDate || !endDate) return; // 型ガード (上で必ず設定済みのはず)

  const update: Record<string, unknown> = {};
  if (needsPeriod) {
    update.startDate = startDate;
    update.endDate = endDate;
  }

  if (needsEssay) {
    try {
      const snap = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .where("submittedAt", ">=", startDate)
        .where("submittedAt", "<=", endDate)
        .get();
      const mapped = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          submittedAt: data.submittedAt?.toDate?.() ?? new Date(),
          scores: data.scores ?? null,
        };
      });
      const stats = computeEssayStats(mapped, []);
      if (stats.categoryAverages) {
        report.essayStats.categoryAverages = stats.categoryAverages;
        update["essayStats.categoryAverages"] = stats.categoryAverages;
      }
    } catch (e) {
      console.warn("[backfill] essay categoryAverages failed:", e);
    }
  }

  if (needsInterview) {
    try {
      const snap = await adminDb
        .collection("interviews")
        .where("userId", "==", userId)
        .where("startedAt", ">=", startDate)
        .where("startedAt", "<=", endDate)
        .get();
      const mapped = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          startedAt: data.startedAt?.toDate?.() ?? new Date(),
          scores: data.scores ?? null,
        };
      });
      const stats = computeInterviewStats(mapped, []);
      if (stats.categoryAverages) {
        report.interviewStats.categoryAverages = stats.categoryAverages;
        update["interviewStats.categoryAverages"] = stats.categoryAverages;
      }
    } catch (e) {
      console.warn("[backfill] interview categoryAverages failed:", e);
    }
  }

  if (Object.keys(update).length > 0) {
    // fire-and-forget で書き戻し。失敗してもユーザーレスポンスには影響させない
    void adminDb
      .doc(`users/${userId}/growthReports/${report.id}`)
      .update(update)
      .catch((e) =>
        console.warn("[backfill] write back failed:", e),
      );
  }
}
