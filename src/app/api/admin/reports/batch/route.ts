import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { generateGrowthReport, getPeriodRange } from "@/lib/growth/report";
import type { BatchReportRequest, GrowthReportSummary } from "@/lib/types/growth-report";

function generateMockBatchReports(period: "weekly" | "monthly"): GrowthReportSummary[] {
  const { start, end } = getPeriodRange(period);
  const students = [
    { id: "mock_student_001", name: "田中 太郎", essayCount: 3, interviewCount: 1, essayChange: 2.3, interviewChange: 1.0 },
    { id: "mock_student_002", name: "佐藤 花子", essayCount: 1, interviewCount: 0, essayChange: -1.5, interviewChange: 0 },
    { id: "mock_student_003", name: "鈴木 一郎", essayCount: 4, interviewCount: 2, essayChange: 4.2, interviewChange: 3.0 },
    { id: "mock_student_004", name: "山田 美咲", essayCount: 2, interviewCount: 1, essayChange: -3.8, interviewChange: -2.0 },
    { id: "mock_student_005", name: "高橋 健太", essayCount: 0, interviewCount: 0, essayChange: 0, interviewChange: 0 },
  ];
  return students.map((s) => ({
    id: `report_${s.id}_${period}_${Date.now()}`,
    studentId: s.id,
    studentName: s.name,
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    generatedAt: new Date().toISOString(),
    essayCount: period === "weekly" ? s.essayCount : s.essayCount * 3,
    interviewCount: period === "weekly" ? s.interviewCount : s.interviewCount * 3,
    essayScoreChange: s.essayChange,
    interviewScoreChange: s.interviewChange,
    overallAssessment:
      s.essayCount === 0
        ? "今期間は学習活動がありませんでした。計画的に取り組みましょう。"
        : s.essayChange > 0
          ? "安定した学習ペースを維持しています。"
          : "もう少し学習量を増やすことをお勧めします。",
  }));
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const body: BatchReportRequest = await request.json();
    const { period } = body;

    if (!period || !["weekly", "monthly"].includes(period)) {
      return NextResponse.json(
        { error: "period（weekly/monthly）は必須です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(generateMockBatchReports(period));
    }

    // Fetch all managed students
    const studentsQuery =
      role === "superadmin"
        ? adminDb.collection("users").where("role", "==", "student")
        : adminDb
            .collection("users")
            .where("role", "==", "student")
            .where("managedBy", "==", uid);

    const studentsSnap = await studentsQuery.get();

    const { start, end } = getPeriodRange(period);
    const prevStart = new Date(start);
    if (period === "weekly") {
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      prevStart.setMonth(prevStart.getMonth() - 1);
    }

    const summaries: GrowthReportSummary[] = await Promise.all(
      studentsSnap.docs.map(async (studentDoc) => {
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();

        const [periodEssaysSnap, prevEssaysSnap, periodInterviewsSnap, prevInterviewsSnap, weaknessesSnap] =
          await Promise.all([
            adminDb!
              .collection(`users/${studentId}/essays`)
              .where("submittedAt", ">=", start)
              .where("submittedAt", "<=", end)
              .orderBy("submittedAt", "desc")
              .get()
              .catch(() => ({ docs: [] })),
            adminDb!
              .collection(`users/${studentId}/essays`)
              .where("submittedAt", ">=", prevStart)
              .where("submittedAt", "<", start)
              .orderBy("submittedAt", "desc")
              .get()
              .catch(() => ({ docs: [] })),
            adminDb!
              .collection(`users/${studentId}/interviews`)
              .where("startedAt", ">=", start)
              .where("startedAt", "<=", end)
              .orderBy("startedAt", "desc")
              .get()
              .catch(() => ({ docs: [] })),
            adminDb!
              .collection(`users/${studentId}/interviews`)
              .where("startedAt", ">=", prevStart)
              .where("startedAt", "<", start)
              .orderBy("startedAt", "desc")
              .get()
              .catch(() => ({ docs: [] })),
            adminDb!
              .collection(`users/${studentId}/weaknesses`)
              .get()
              .catch(() => ({ docs: [] })),
          ]);

        const toEssayData = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const d = doc.data();
          return {
            id: doc.id,
            submittedAt: d.submittedAt?.toDate?.() ?? new Date(),
            scores: d.scores ?? null,
          };
        };

        const toInterviewData = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const d = doc.data();
          return {
            id: doc.id,
            startedAt: d.startedAt?.toDate?.() ?? new Date(),
            scores: d.scores ? { total: d.scores.total ?? 0 } : null,
          };
        };

        const report = generateGrowthReport({
          studentId,
          studentName: studentData.displayName ?? "",
          period,
          periodEssays: periodEssaysSnap.docs.map(toEssayData),
          previousEssays: prevEssaysSnap.docs.map(toEssayData),
          periodInterviews: periodInterviewsSnap.docs.map(toInterviewData),
          previousInterviews: prevInterviewsSnap.docs.map(toInterviewData),
          weaknesses: weaknessesSnap.docs.map((d) => {
            const wData = d.data();
            return {
              area: wData.area ?? "",
              count: wData.count ?? 0,
              improving: wData.improving ?? false,
              resolved: wData.resolved ?? false,
            };
          }),
        });

        // Save to Firestore (non-critical)
        await adminDb!
          .collection(`users/${studentId}/growthReports`)
          .doc(report.id)
          .set({
            ...report,
            generatedAt: new Date(),
            startDate: new Date(report.startDate),
            endDate: new Date(report.endDate),
            generatedBy: uid,
          })
          .catch(() => {
            console.warn(`Failed to save report for student ${studentId}`);
          });

        return {
          id: report.id,
          studentId: report.studentId,
          studentName: report.studentName,
          period: report.period,
          startDate: report.startDate,
          endDate: report.endDate,
          generatedAt: report.generatedAt,
          essayCount: report.essayStats.count,
          interviewCount: report.interviewStats.count,
          essayScoreChange: report.essayStats.scoreChange,
          interviewScoreChange: report.interviewStats.scoreChange,
          overallAssessment: report.overallAssessment,
        } satisfies GrowthReportSummary;
      })
    );

    // Sort by essay score change ascending (worst first)
    summaries.sort((a, b) => a.essayScoreChange - b.essayScoreChange);

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Batch report generation error:", error);
    return NextResponse.json(
      { error: "一括レポート生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
