import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { generateGrowthReport, getPeriodRange, buildSessionSummaryDraft } from "@/lib/growth/report";
import { buildLessonObservationSummaryPrompt } from "@/lib/ai/prompts/lesson-summary";
import type { GenerateReportRequest, GrowthReport } from "@/lib/types/growth-report";

// Mock data for dev mode
function generateMockReport(studentId: string, period: "weekly" | "monthly"): GrowthReport {
  const { start, end } = getPeriodRange(period);
  const mockNames: Record<string, string> = {
    mock_student_001: "田中 太郎",
    mock_student_002: "佐藤 花子",
    mock_student_003: "鈴木 一郎",
    mock_student_004: "山田 美咲",
    mock_student_005: "高橋 健太",
  };
  return {
    id: `report_${studentId}_${period}_${Date.now()}`,
    studentId,
    studentName: mockNames[studentId] ?? "テスト生徒",
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    generatedAt: new Date().toISOString(),
    essayStats: {
      count: period === "weekly" ? 3 : 8,
      avgScore: 35.5,
      scoreChange: 2.3,
      bestCategory: "論理性",
      worstCategory: "独自性",
    },
    interviewStats: {
      count: period === "weekly" ? 1 : 4,
      avgScore: 32.0,
      scoreChange: -1.5,
    },
    weaknessProgress: [
      { weakness: "論理の飛躍", previousScore: 4, currentScore: 6, status: "improved", attempts: 5 },
      { weakness: "具体例不足", previousScore: 5, currentScore: 5, status: "stable", attempts: 3 },
      { weakness: "結論の弱さ", previousScore: 6, currentScore: 4, status: "declined", attempts: 4 },
    ],
    recommendations: [
      "小論文スコアが2.3点上昇しました。この調子で継続しましょう。",
      "「独自性」が最も改善の余地があります。意識的に強化しましょう。",
      "「結論の弱さ」が長期的に改善されていません。異なるアプローチでの練習を検討しましょう。",
    ],
    overallAssessment:
      "安定した学習ペースを維持しています。小論文のスコアは順調に向上しています。弱点の改善が進んでおり、成長が感じられます。",
  };
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const body: GenerateReportRequest = await request.json();
    const { studentId, period } = body;

    if (!studentId || !period || !["weekly", "monthly"].includes(period)) {
      return NextResponse.json(
        { error: "studentIdとperiod（weekly/monthly）は必須です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(generateMockReport(studentId, period));
    }

    // Verify student exists and is managed by caller
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const studentData = studentDoc.data()!;
    if (role !== "superadmin" && studentData.managedBy !== uid) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { start, end } = getPeriodRange(period);
    const prevStart = new Date(start);
    if (period === "weekly") {
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      prevStart.setMonth(prevStart.getMonth() - 1);
    }

    // Fetch essays for current and previous period
    const [periodEssaysSnap, prevEssaysSnap, periodInterviewsSnap, prevInterviewsSnap, weaknessesSnap] =
      await Promise.all([
        adminDb
          .collection("essays")
          .where("userId", "==", studentId)
          .where("submittedAt", ">=", start)
          .where("submittedAt", "<=", end)
          .orderBy("submittedAt", "desc")
          .get()
          .catch(() => ({ docs: [] })),
        adminDb
          .collection("essays")
          .where("userId", "==", studentId)
          .where("submittedAt", ">=", prevStart)
          .where("submittedAt", "<", start)
          .orderBy("submittedAt", "desc")
          .get()
          .catch(() => ({ docs: [] })),
        adminDb
          .collection("interviews")
          .where("userId", "==", studentId)
          .where("startedAt", ">=", start)
          .where("startedAt", "<=", end)
          .orderBy("startedAt", "desc")
          .get()
          .catch(() => ({ docs: [] })),
        adminDb
          .collection("interviews")
          .where("userId", "==", studentId)
          .where("startedAt", ">=", prevStart)
          .where("startedAt", "<", start)
          .orderBy("startedAt", "desc")
          .get()
          .catch(() => ({ docs: [] })),
        adminDb
          .collection(`users/${studentId}/weaknesses`)
          .get()
          .catch(() => ({ docs: [] })),
      ]);

    // 期間内セッション取得
    const sessionsSnap = await adminDb
      .collection("sessions")
      .where("studentId", "==", studentId)
      .where("scheduledAt", ">=", start.toISOString())
      .where("scheduledAt", "<=", end.toISOString())
      .orderBy("scheduledAt", "desc")
      .get()
      .catch(() => ({ docs: [] }));
    const sessions = sessionsSnap.docs.map((d) => d.data()) as Array<{
      status?: string;
      prepPlan?: { goal?: string };
      debrief?: {
        notes?: string;
        newWeaknessAreas?: string[];
        nextAgendaSeed?: string;
      };
      scheduledAt?: string;
    }>;
    const sessionSummary = buildSessionSummaryDraft(sessions);

    // debrief が 2 件以上あれば AI で観察キーポイント抽出
    const debriefNotes = sessions
      .filter((s) => s.status === "completed" && s.debrief?.notes)
      .map((s) => s.debrief!.notes!)
      .filter((n) => n.trim().length > 0);
    if (debriefNotes.length >= 2 && process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic();
        const concatenated = debriefNotes.join("\n---\n");
        const systemPrompt = buildLessonObservationSummaryPrompt(
          studentData.displayName ?? "生徒",
          concatenated,
        );
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: "JSON 配列を出力してください。" }],
        });
        const text =
          resp.content[0]?.type === "text" ? resp.content[0].text : "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) {
            sessionSummary.teacherObservations = parsed
              .filter((s) => typeof s === "string")
              .slice(0, 3);
          }
        }
      } catch (err) {
        console.warn("[reports/generate] observation extraction failed:", err);
      }
    }

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
      sessionSummary: sessionSummary.totalCount > 0 ? sessionSummary : undefined,
    });

    // Save the report to Firestore
    await adminDb
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
        // Non-critical: log but don't fail
        console.warn("Failed to save growth report to Firestore");
      });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "レポート生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
