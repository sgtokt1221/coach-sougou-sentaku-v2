import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
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
      const docs = all.docs.slice().sort((a, b) => {
        const ta = (a.data().generatedAt?.toDate?.()?.getTime?.() ?? 0) as number;
        const tb = (b.data().generatedAt?.toDate?.()?.getTime?.() ?? 0) as number;
        return tb - ta;
      }).slice(0, limit);
      snap = { docs };
    }

    step = "map_results";
    const reports: GrowthReport[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
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
        } as GrowthReport;
      })
      // 公開オフは除外。undefined は「未設定 = デフォルト公開」とみなす
      .filter((r) => r.sharedWithStudent !== false);

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
