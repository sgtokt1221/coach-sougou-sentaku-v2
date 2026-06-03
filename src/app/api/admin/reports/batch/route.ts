import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getOrgMemberAdminUids, chunk } from "@/lib/api/organization-scope";
import { adminDb } from "@/lib/firebase/admin";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import { generateGrowthReport, getPeriodRange } from "@/lib/growth/report";
import {
  collectWeaknessTags,
  mergeCountMaps,
} from "@/lib/growth/weakness-aggregate";
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
    hasPracticeQuestions: false,
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
      if (process.env.NODE_ENV === "development") {
        console.warn("[reports/batch] adminDb missing — dev mock");
        return NextResponse.json(generateMockBatchReports(period));
      }
      return NextResponse.json(
        { error: "Firestore に接続できません", detail: "adminDb is not initialized" },
        { status: 500 }
      );
    }

    // 対象生徒を取得 (admin は自分の塾の組織メンバーが managedBy の生徒を共有)
    const studentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (role === "superadmin") {
      studentDocs.push(
        ...(await adminDb.collection("users").where("role", "==", "student").get()).docs,
      );
    } else if (role === "admin") {
      const memberUids = await getOrgMemberAdminUids(adminDb, uid);
      const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      for (const part of chunk(memberUids, 30)) {
        const s = await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "in", part)
          .get();
        s.docs.forEach((d) => byId.set(d.id, d));
      }
      studentDocs.push(...byId.values());
    } else {
      studentDocs.push(
        ...(
          await adminDb
            .collection("users")
            .where("role", "==", "student")
            .where("managedBy", "==", uid)
            .get()
        ).docs,
      );
    }

    const { start, end } = getPeriodRange(period);
    const prevStart = new Date(start);
    if (period === "weekly") {
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      prevStart.setMonth(prevStart.getMonth() - 1);
    }

    const summaries: GrowthReportSummary[] = await Promise.all(
      studentDocs.map(async (studentDoc) => {
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();

        // 各クエリは「高速経路 → JS フィルタ fallback」で silent fallback を回避。
        // 失敗時は throw されて呼び出し側 catch で 500 に昇格する。
        const [periodEssaysSnap, prevEssaysSnap, periodInterviewsSnap, prevInterviewsSnap, weaknessesSnap] =
          await Promise.all([
            queryWithRangeFilter(
              adminDb!.collection("essays"),
              "userId",
              studentId,
              "submittedAt",
              start,
              end,
            ),
            queryWithRangeFilter(
              adminDb!.collection("essays"),
              "userId",
              studentId,
              "submittedAt",
              prevStart,
              start,
            ),
            queryWithRangeFilter(
              adminDb!.collection("interviews"),
              "userId",
              studentId,
              "startedAt",
              start,
              end,
            ),
            queryWithRangeFilter(
              adminDb!.collection("interviews"),
              "userId",
              studentId,
              "startedAt",
              prevStart,
              start,
            ),
            adminDb!.collection(`users/${studentId}/weaknesses`).get(),
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
          const s = d.scores;
          return {
            id: doc.id,
            startedAt: d.startedAt?.toDate?.() ?? new Date(),
            scores: s
              ? {
                  total: typeof s.total === "number" ? s.total : 0,
                  clarity: typeof s.clarity === "number" ? s.clarity : undefined,
                  apAlignment:
                    typeof s.apAlignment === "number" ? s.apAlignment : undefined,
                  enthusiasm:
                    typeof s.enthusiasm === "number" ? s.enthusiasm : undefined,
                  specificity:
                    typeof s.specificity === "number" ? s.specificity : undefined,
                  bodyLanguage:
                    typeof s.bodyLanguage === "number" ? s.bodyLanguage : undefined,
                }
              : null,
          };
        };

        // 期間別の weaknessTags 集計 (悪化/改善判定で使用)
        const periodWeaknessCounts = mergeCountMaps(
          collectWeaknessTags(periodEssaysSnap.docs),
          collectWeaknessTags(periodInterviewsSnap.docs),
        );
        const previousWeaknessCounts = mergeCountMaps(
          collectWeaknessTags(prevEssaysSnap.docs),
          collectWeaknessTags(prevInterviewsSnap.docs),
        );

        const report = generateGrowthReport({
          studentId,
          studentName: studentData.displayName ?? "",
          period,
          periodEssays: periodEssaysSnap.docs.map(toEssayData),
          previousEssays: prevEssaysSnap.docs.map(toEssayData),
          periodInterviews: periodInterviewsSnap.docs.map(toInterviewData),
          previousInterviews: prevInterviewsSnap.docs.map(toInterviewData),
          weaknesses: weaknessesSnap.docs
            .filter((d) => !d.data().archivedAt) // Phase 4: archive 除外
            .map((d) => {
              const wData = d.data();
              return {
                area: wData.area ?? "",
                count: wData.count ?? 0,
                improving: wData.improving ?? false,
                resolved: wData.resolved ?? false,
              };
            }),
          periodWeaknessCounts,
          previousWeaknessCounts,
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
          // 一括生成では類題を作らないので常に false
          hasPracticeQuestions: false,
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
