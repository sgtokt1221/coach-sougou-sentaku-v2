import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
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
      if (process.env.NODE_ENV === "development") {
        console.warn("[reports/[studentId]] adminDb missing — dev mock");
        return NextResponse.json(generateMockReportHistory(studentId, period, limit));
      }
      return NextResponse.json(
        { error: "Firestore に接続できません", detail: "adminDb is not initialized" },
        { status: 500 }
      );
    }

    // Verify student is managed by caller
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const studentData = studentDoc.data()!;
    // 管理者(managedBy / 同じ塾の組織メンバー) と担当講師(assignedTeacherIds)が閲覧可
    const denied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: studentData.managedBy as string | undefined,
        organizationId: studentData.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(studentData),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;

    // period 指定時は equality のみで取得し generatedAt はメモリ内ソートする。
    // (where(period) + orderBy(generatedAt) は複合インデックスが必要になり、
    //  未作成だと FAILED_PRECONDITION で空が返るため。生徒あたり件数は小さい)
    const collectionRef = adminDb.collection(`users/${studentId}/growthReports`);
    const query = period
      ? collectionRef.where("period", "==", period).limit(50)
      : collectionRef.orderBy("generatedAt", "desc").limit(limit);

    const reportsSnap = await query.get().catch((err) => {
      console.error("[reports/[studentId]] query failed:", err);
      return { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };
    });

    let reports: GrowthReport[] = reportsSnap.docs.map((doc) => {
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
        sessionSummary: data.sessionSummary,
        practiceQuestions: data.practiceQuestions,
        teacherComment: data.teacherComment,
        editedBy: data.editedBy,
        editedAt: data.editedAt,
        sharedWithStudent: data.sharedWithStudent,
      };
    });

    // period 指定時は Firestore 側で並べていないのでメモリ内で generatedAt 降順ソート
    // (ISO 文字列の辞書順 = 時系列順)。その後 limit 件に絞る。
    if (period) {
      reports = reports
        .sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1))
        .slice(0, limit);
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Report history error:", error);
    return NextResponse.json(
      { error: "レポート履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
