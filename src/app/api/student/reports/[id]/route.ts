import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { toDateSafe, toIsoString } from "@/lib/firebase/timestamp";
import {
  computeEssayStats,
  computeInterviewStats,
} from "@/lib/growth/report";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * GET /api/student/reports/[id]
 *
 * 認証ユーザー自身の成長レポート 1 件を返す。
 * 他人のレポートは 404 扱い (存在を漏らさない)。
 * `sharedWithStudent === false` のレポートも生徒には見せない。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const docSnap = await adminDb
      .doc(`users/${auth.uid}/growthReports/${id}`)
      .get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "レポートが見つかりません" },
        { status: 404 }
      );
    }

    const data = docSnap.data()!;
    // sharedWithStudent が false なら生徒には見せない (404 扱い)
    if (data.sharedWithStudent === false) {
      return NextResponse.json(
        { error: "レポートが見つかりません" },
        { status: 404 }
      );
    }

    const editedAtIso = toIsoString(data.editedAt);
    const report: GrowthReport = {
      id: docSnap.id,
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
    };

    // バックフィル: startDate/endDate (空なら generatedAt から推定) と
    // categoryAverages (count > 0 なら essays/interviews 集計) を一度に補完
    await backfillReport(auth.uid, report).catch((e) =>
      console.warn(
        `[student/reports/id] backfill failed for ${report.id}:`,
        e instanceof Error ? e.message : e,
      ),
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("[student/reports GET id] error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "レポートの取得に失敗しました", detail },
      { status: 500 }
    );
  }
}

/**
 * 古いレポートのバックフィル:
 * - startDate / endDate が空なら generatedAt から推定 (週次=7日前、月次=1ヶ月前)
 * - count > 0 かつ categoryAverages 未設定なら期間内 essays/interviews を集計
 *
 * `report` を mutate しつつ Firestore に書き戻し (fire-and-forget)。
 * 一度補完されたら次回からは Firestore キャッシュからそのまま読まれる。
 * (list API と同じロジック。共通化は別タスク)
 */
async function backfillReport(
  userId: string,
  report: GrowthReport,
): Promise<void> {
  if (!adminDb) return;

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
  if (!startDate || !endDate) return;

  const update: Record<string, unknown> = {};
  if (needsPeriod) {
    update.startDate = startDate;
    update.endDate = endDate;
  }

  if (needsEssay) {
    try {
      const snap = await queryWithRangeFilter(
        adminDb.collection("essays"),
        "userId",
        userId,
        "submittedAt",
        startDate,
        endDate,
      );
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
      const snap = await queryWithRangeFilter(
        adminDb.collection("interviews"),
        "userId",
        userId,
        "startedAt",
        startDate,
        endDate,
      );
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
    void adminDb
      .doc(`users/${userId}/growthReports/${report.id}`)
      .update(update)
      .catch((e) =>
        console.warn("[backfill] write back failed:", e),
      );
  }
}
