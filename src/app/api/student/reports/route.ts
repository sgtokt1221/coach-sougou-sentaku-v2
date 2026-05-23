import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * Firestore Timestamp / Date instance / 既に string / { _seconds } 形式の
 * いずれも受け取り、ISO 文字列に正規化する。
 *
 * これがないと:
 * - data.generatedAt が Timestamp 由来でも plain object として来る経路があり、
 *   その object が JSON 化されて client に届く
 * - client 側で `(v ?? "").localeCompare(...)` 等を呼ぶと TypeError になる
 * - React で `{report.generatedAt}` を render しようとすると #31 になる
 */
function toIsoString(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const obj = v as {
      _seconds?: number;
      seconds?: number;
      toDate?: () => Date;
    };
    if (typeof obj.toDate === "function") {
      try {
        return obj.toDate().toISOString();
      } catch {
        // toDate が壊れてる場合は次の経路で
      }
    }
    const sec = obj._seconds ?? obj.seconds;
    if (typeof sec === "number") {
      return new Date(sec * 1000).toISOString();
    }
  }
  return undefined;
}

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
