import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ExamResultStats } from "@/lib/types/exam-result";

interface DashboardResponse {
  examResultStats: ExamResultStats;
}

const MOCK_STATS: DashboardResponse = {
  examResultStats: {
    totalApplied: 5,
    totalPassed: 3,
    totalFailed: 1,
    totalWithdrawn: 0,
    passRate: 75,
  },
};

/**
 * GET /api/admin/dashboard
 * ダッシュボード用集計データ（合格率等）
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(MOCK_STATS);
    }

    // managedByスコーピング: 担当生徒のIDを取得
    let studentIds: string[] = [];
    if (role === "superadmin") {
      const { searchParams } = new URL(request.url);
      const viewAs = searchParams.get("viewAs");
      if (viewAs) {
        const studentsSnap = await adminDb
          .collection("users")
          .where("managedBy", "==", viewAs)
          .get();
        studentIds = studentsSnap.docs.map((d) => d.id);
      } else {
        const studentsSnap = await adminDb
          .collection("users")
          .where("role", "==", "student")
          .get();
        studentIds = studentsSnap.docs.map((d) => d.id);
      }
    } else {
      const studentsSnap = await adminDb
        .collection("users")
        .where("managedBy", "==", uid)
        .get();
      studentIds = studentsSnap.docs.map((d) => d.id);
    }

    // 全担当生徒のexamResultsを集計
    let totalApplied = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWithdrawn = 0;

    for (const studentId of studentIds) {
      try {
        const resultsSnap = await adminDb
          .collection(`users/${studentId}/examResults`)
          .get();
        for (const doc of resultsSnap.docs) {
          const status = doc.data().status;
          switch (status) {
            case "applied":
              totalApplied++;
              break;
            case "passed":
              totalPassed++;
              break;
            case "failed":
              totalFailed++;
              break;
            case "withdrawn":
              totalWithdrawn++;
              break;
          }
        }
      } catch {
        // 個別生徒のデータ取得エラーはスキップ
      }
    }

    const decided = totalPassed + totalFailed;
    const passRate = decided > 0 ? Math.round((totalPassed / decided) * 100) : null;

    const response: DashboardResponse = {
      examResultStats: {
        totalApplied,
        totalPassed,
        totalFailed,
        totalWithdrawn,
        passRate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "ダッシュボードデータの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
