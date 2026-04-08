import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getPeriodRange } from "@/lib/growth/report";
import type { GrowthReport } from "@/lib/types/growth-report";

function generateMockReportHistory(
  studentId: string,
  period: "weekly" | "monthly" | null,
  limit: number
): GrowthReport[] {
  const reports: GrowthReport[] = [];
  const mockNames: Record<string, string> = {
    mock_student_001: "田中 太郎",
    mock_student_002: "佐藤 花子",
    mock_student_003: "鈴木 一郎",
    mock_student_004: "山田 美咲",
    mock_student_005: "高橋 健太",
  };
  const studentName = mockNames[studentId] ?? "テスト生徒";

  const periods: ("weekly" | "monthly")[] = period ? [period] : ["weekly", "monthly"];

  for (let i = 0; i < Math.min(limit, 5); i++) {
    const p = periods[i % periods.length];
    const date = new Date();
    date.setDate(date.getDate() - i * (p === "weekly" ? 7 : 30));
    const { start, end } = getPeriodRange(p);
    start.setDate(start.getDate() - i * (p === "weekly" ? 7 : 30));
    end.setDate(end.getDate() - i * (p === "weekly" ? 7 : 30));

    reports.push({
      id: `report_${studentId}_${p}_${Date.now() - i * 1000}`,
      studentId,
      studentName,
      period: p,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      generatedAt: date.toISOString(),
      essayStats: {
        count: 3 - Math.floor(i / 2),
        avgScore: 35 + i * 1.5,
        scoreChange: 2 - i * 0.5,
        bestCategory: "論理性",
        worstCategory: "独自性",
      },
      interviewStats: {
        count: 1,
        avgScore: 30 + i,
        scoreChange: 1 - i * 0.3,
      },
      weaknessProgress: [
        {
          weakness: "論理の飛躍",
          previousScore: 4 + i,
          currentScore: 5 + i,
          status: "improved",
          attempts: 5 - i,
        },
      ],
      recommendations: [
        "小論文スコアが改善傾向です。この調子で継続しましょう。",
      ],
      overallAssessment: "安定した学習ペースを維持しています。",
    });
  }

  return reports;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") as "weekly" | "monthly" | null;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

    if (!adminDb) {
      return NextResponse.json(generateMockReportHistory(studentId, period, limit));
    }

    // Verify student is managed by caller
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const studentData = studentDoc.data()!;
    if (role !== "superadmin" && studentData.managedBy !== uid) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    let query = adminDb
      .collection(`users/${studentId}/growthReports`)
      .orderBy("generatedAt", "desc")
      .limit(limit);

    if (period) {
      query = query.where("period", "==", period);
    }

    const reportsSnap = await query.get().catch(() => ({ docs: [] }));

    const reports: GrowthReport[] = reportsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: data.studentId ?? studentId,
        studentName: data.studentName ?? "",
        period: data.period ?? "weekly",
        startDate: data.startDate?.toDate?.()?.toISOString() ?? "",
        endDate: data.endDate?.toDate?.()?.toISOString() ?? "",
        generatedAt: data.generatedAt?.toDate?.()?.toISOString() ?? "",
        essayStats: data.essayStats ?? { count: 0, avgScore: 0, scoreChange: 0, bestCategory: "-", worstCategory: "-" },
        interviewStats: data.interviewStats ?? { count: 0, avgScore: 0, scoreChange: 0 },
        weaknessProgress: data.weaknessProgress ?? [],
        recommendations: data.recommendations ?? [],
        overallAssessment: data.overallAssessment ?? "",
      };
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Report history error:", error);
    return NextResponse.json(
      { error: "レポート履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
