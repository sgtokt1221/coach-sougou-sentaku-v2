import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { generateGrowthReport, getPeriodRange, buildSessionSummaryDraft } from "@/lib/growth/report";
import { buildLessonObservationSummaryPrompt } from "@/lib/ai/prompts/lesson-summary";
import { buildPracticeQuestionsPrompt } from "@/lib/ai/prompts/practice-questions";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import type { GenerateReportRequest, GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";

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

/**
 * オブジェクトから undefined 値のフィールドを再帰的に取り除く。
 * Firestore は undefined を拒否するため、ペイロード書き込み前に通す。
 */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  // Date は再帰展開せず素通し
  // (Object.entries(new Date()) が空配列を返す仕様で {} に潰される問題を回避)
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    // Firestore Timestamp など toDate を持つオブジェクトも素通し
    if (typeof (obj as { toDate?: unknown }).toDate === "function") {
      return obj;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return obj;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  // step ラベルで失敗箇所を可視化する
  let step = "start";

  try {
    step = "parse_body";
    const body: GenerateReportRequest = await request.json();
    const { studentId, period } = body;

    if (!studentId || !period || !["weekly", "monthly"].includes(period)) {
      return NextResponse.json(
        { error: "studentIdとperiod（weekly/monthly）は必須です" },
        { status: 400 }
      );
    }

    step = "init_check";
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[reports/generate] adminDb missing — dev mock");
        return NextResponse.json(generateMockReport(studentId, period));
      }
      return NextResponse.json(
        {
          error: "Firestore に接続できません",
          detail: "adminDb is not initialized",
          step,
        },
        { status: 500 }
      );
    }

    step = "fetch_student";
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const studentData = studentDoc.data()!;
    step = "check_permission";
    if (role !== "superadmin" && studentData.managedBy !== uid) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    step = "compute_period";
    const { start, end } = getPeriodRange(period);
    const prevStart = new Date(start);
    if (period === "weekly") {
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      prevStart.setMonth(prevStart.getMonth() - 1);
    }

    // 各クエリは「composite index 高速経路 → JS フィルタ fallback」パターン。
    // 失敗が起きたら catch で 500 に昇格させ、silent に 0 件レポートを返さない。

    step = "fetch_essays_current";
    const periodEssaysSnap = await queryWithRangeFilter(
      adminDb.collection("essays"),
      "userId",
      studentId,
      "submittedAt",
      start,
      end,
    );

    step = "fetch_essays_prev";
    const prevEssaysSnap = await queryWithRangeFilter(
      adminDb.collection("essays"),
      "userId",
      studentId,
      "submittedAt",
      prevStart,
      start,
    );

    step = "fetch_interviews_current";
    const periodInterviewsSnap = await queryWithRangeFilter(
      adminDb.collection("interviews"),
      "userId",
      studentId,
      "startedAt",
      start,
      end,
    );

    step = "fetch_interviews_prev";
    const prevInterviewsSnap = await queryWithRangeFilter(
      adminDb.collection("interviews"),
      "userId",
      studentId,
      "startedAt",
      prevStart,
      start,
    );

    step = "fetch_weaknesses";
    const weaknessesSnap = await adminDb
      .collection(`users/${studentId}/weaknesses`)
      .get();

    // sessions は scheduledAt が ISO 文字列のため、queryWithRangeFilter
    // (Date 比較前提) ではなく文字列比較版の inline fallback を採用
    step = "fetch_sessions";
    let sessionsSnap: { docs: FirebaseFirestore.QueryDocumentSnapshot[] };
    try {
      sessionsSnap = await adminDb
        .collection("sessions")
        .where("studentId", "==", studentId)
        .where("scheduledAt", ">=", start.toISOString())
        .where("scheduledAt", "<=", end.toISOString())
        .orderBy("scheduledAt", "desc")
        .get();
    } catch (indexErr) {
      console.warn("[reports/generate] sessions index missing, fallback to JS filter:", indexErr);
      const all = await adminDb
        .collection("sessions")
        .where("studentId", "==", studentId)
        .get();
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const filtered = all.docs.filter((d) => {
        const at = d.data().scheduledAt as string | undefined;
        return typeof at === "string" && at >= startIso && at <= endIso;
      });
      filtered.sort((a, b) =>
        ((b.data().scheduledAt as string) ?? "").localeCompare(
          (a.data().scheduledAt as string) ?? "",
        ),
      );
      sessionsSnap = { docs: filtered };
    }
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
    step = "ai_observation";
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

    step = "map_docs";
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

    // 弱点・過去問から類題を AI 生成 (失敗してもレポート本体は完成させる)
    step = "generate_practice_questions";
    let practiceQuestions: PracticeQuestion[] | undefined;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const weaknessAreas = weaknessesSnap.docs
          .map((d) => (d.data() as { area?: string }).area)
          .filter((a): a is string => !!a && a.length > 0)
          .slice(0, 5);

        const pastEssayTopics = [
          ...periodEssaysSnap.docs,
          ...prevEssaysSnap.docs,
        ]
          .map((d) => {
            const data = d.data() as { topic?: string };
            return data.topic;
          })
          .filter((t): t is string => !!t && t.length > 0)
          .slice(0, 10);

        const pastInterviewQuestions: string[] = [];
        [...periodInterviewsSnap.docs, ...prevInterviewsSnap.docs].forEach(
          (d) => {
            const data = d.data() as {
              messages?: Array<{ role?: string; content?: string }>;
            };
            data.messages
              ?.filter((m) => m?.role === "assistant" || m?.role === "ai")
              .forEach((m) => {
                const q = m.content?.split("\n")[0]?.slice(0, 80);
                if (q) pastInterviewQuestions.push(q);
              });
          }
        );

        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic();
        const systemPrompt = buildPracticeQuestionsPrompt({
          studentName: studentData.displayName ?? "生徒",
          weaknesses: weaknessAreas,
          pastEssayTopics,
          pastInterviewQuestions: pastInterviewQuestions.slice(0, 10),
        });
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: "JSON のみを出力してください。" }],
        });
        const text =
          resp.content[0]?.type === "text" ? resp.content[0].text : "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as {
            essayQuestions?: Array<Partial<PracticeQuestion>>;
            interviewQuestions?: Array<Partial<PracticeQuestion>>;
          };
          const now = Date.now();
          const combined: PracticeQuestion[] = [
            ...(parsed.essayQuestions ?? []).map((q, i) => ({
              id: q.id || `pq_e_${now}_${i}`,
              type: "essay" as const,
              title: q.title ?? "",
              relatedWeakness: q.relatedWeakness,
              relatedPastTopic: q.relatedPastTopic,
            })),
            ...(parsed.interviewQuestions ?? []).map((q, i) => ({
              id: q.id || `pq_i_${now}_${i}`,
              type: "interview" as const,
              title: q.title ?? "",
              relatedWeakness: q.relatedWeakness,
              relatedPastTopic: q.relatedPastTopic,
            })),
          ]
            .filter((q) => q.title.length > 0)
            .slice(0, 8);
          if (combined.length > 0) practiceQuestions = combined;
        }
      } catch (err) {
        console.warn("[reports/generate] practice questions failed:", err);
      }
    }

    step = "generate_report";
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
      practiceQuestions,
    });

    // Save the report to Firestore
    step = "save_to_firestore";
    const payload = stripUndefined({
      ...report,
      generatedAt: new Date(),
      startDate: new Date(report.startDate),
      endDate: new Date(report.endDate),
      generatedBy: uid,
      // デフォルトで生徒に公開。管理者が後から PATCH で false に変更可能
      sharedWithStudent: true,
    });
    await adminDb
      .collection(`users/${studentId}/growthReports`)
      .doc(report.id)
      .set(payload)
      .catch((e) => {
        // Non-critical: log but don't fail
        console.warn("[reports/generate] Firestore save failed:", e);
      });

    step = "done";
    return NextResponse.json(report);
  } catch (error) {
    console.error(`[reports/generate] step=${step} error:`, error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "レポート生成中にエラーが発生しました",
        detail: message,
        step,
        stack: process.env.NODE_ENV === "production" ? undefined : stack,
      },
      { status: 500 }
    );
  }
}
