import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
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

    const report: GrowthReport = {
      id: docSnap.id,
      studentId: auth.uid,
      studentName: data.studentName ?? "",
      period: data.period,
      startDate:
        data.startDate?.toDate?.()?.toISOString?.() ?? data.startDate ?? "",
      endDate:
        data.endDate?.toDate?.()?.toISOString?.() ?? data.endDate ?? "",
      generatedAt:
        data.generatedAt?.toDate?.()?.toISOString?.() ??
        data.generatedAt ??
        new Date().toISOString(),
      essayStats: data.essayStats,
      interviewStats: data.interviewStats,
      weaknessProgress: data.weaknessProgress ?? [],
      recommendations: data.recommendations ?? [],
      overallAssessment: data.overallAssessment ?? "",
      sessionSummary: data.sessionSummary,
      teacherComment: data.teacherComment,
      editedBy: data.editedBy,
      editedAt: data.editedAt,
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
