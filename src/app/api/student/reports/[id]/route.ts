import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { toDateSafe, toIsoString } from "@/lib/firebase/timestamp";
import {
  computeEssayStats,
  computeInterviewStats,
} from "@/lib/growth/report";
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

    // categoryAverages のバックフィル (古いレポート対応)
    await backfillCategoryAverages(auth.uid, report).catch((e) =>
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
 * categoryAverages が未保存の古いレポートに対して、期間内 essays/interviews から
 * 動的に計算し、`report` を mutate しつつ Firestore にも書き戻す。
 * (list API と同じロジックのコピー。共通化するなら別タスクで)
 */
async function backfillCategoryAverages(
  userId: string,
  report: GrowthReport,
): Promise<void> {
  if (!adminDb) return;
  const needsEssay =
    report.essayStats &&
    report.essayStats.count > 0 &&
    !report.essayStats.categoryAverages;
  const needsInterview =
    report.interviewStats &&
    report.interviewStats.count > 0 &&
    !report.interviewStats.categoryAverages;
  if (!needsEssay && !needsInterview) return;

  const startDate = toDateSafe(report.startDate);
  const endDate = toDateSafe(report.endDate);
  if (!startDate || !endDate) return;

  const update: Record<string, unknown> = {};

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
    void adminDb
      .doc(`users/${userId}/growthReports/${report.id}`)
      .update(update)
      .catch((e) =>
        console.warn("[backfill] write back failed:", e),
      );
  }
}
