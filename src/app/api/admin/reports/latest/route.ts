import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { GrowthReportSummary } from "@/lib/types/growth-report";

/**
 * Firestore Timestamp / Date / ISO string を ISO 文字列に正規化する。
 */
function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === "function") return maybeTs.toDate().toISOString();
  return new Date().toISOString();
}

/**
 * 担当生徒それぞれの「最新 1 件」成長レポートを `GrowthReportSummary[]` で返す。
 *
 * 用途: `/admin/reports` ページの初期表示。
 * 生徒詳細から個別生成したレポートも、ここで一覧表示される。
 * 並びは生徒名昇順 (a11y 的に安定)。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[reports/latest] adminDb missing — returning empty list");
      return NextResponse.json([]);
    }
    return NextResponse.json(
      { error: "Firestore に接続できません", detail: "adminDb is not initialized" },
      { status: 500 }
    );
  }

  try {
    const studentsQuery =
      role === "superadmin"
        ? adminDb.collection("users").where("role", "==", "student")
        : adminDb
            .collection("users")
            .where("role", "==", "student")
            .where("managedBy", "==", uid);

    const studentsSnap = await studentsQuery.get();

    const summaries = await Promise.all(
      studentsSnap.docs.map(async (studentDoc) => {
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();

        const reportsSnap = await adminDb!
          .collection(`users/${studentId}/growthReports`)
          .orderBy("generatedAt", "desc")
          .limit(1)
          .get();

        if (reportsSnap.empty) return null;

        const doc = reportsSnap.docs[0];
        const r = doc.data();

        return {
          id: doc.id,
          studentId,
          studentName: r.studentName ?? studentData.displayName ?? "",
          period: r.period,
          startDate: toIso(r.startDate),
          endDate: toIso(r.endDate),
          generatedAt: toIso(r.generatedAt),
          essayCount: r.essayStats?.count ?? 0,
          interviewCount: r.interviewStats?.count ?? 0,
          essayScoreChange: r.essayStats?.scoreChange ?? 0,
          interviewScoreChange: r.interviewStats?.scoreChange ?? 0,
          overallAssessment: r.overallAssessment ?? "",
          hasPracticeQuestions:
            Array.isArray(r.practiceQuestions) && r.practiceQuestions.length > 0,
        } satisfies GrowthReportSummary;
      })
    );

    const filtered = summaries.filter(
      (s): s is NonNullable<(typeof summaries)[number]> => s !== null
    );
    filtered.sort((a, b) => a.studentName.localeCompare(b.studentName, "ja"));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("[reports/latest] error:", error);
    return NextResponse.json(
      {
        error: "最新レポート取得中にエラーが発生しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
