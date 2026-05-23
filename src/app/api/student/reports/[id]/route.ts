import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { toIsoString } from "@/lib/firebase/timestamp";
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
