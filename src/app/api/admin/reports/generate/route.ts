import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { generateGrowthReport, getPeriodRange, buildSessionSummaryDraft } from "@/lib/growth/report";
import {
  collectWeaknessTags,
  mergeCountMaps,
} from "@/lib/growth/weakness-aggregate";
import { buildLessonObservationSummaryPrompt } from "@/lib/ai/prompts/lesson-summary";
import { buildPracticeQuestionsPrompt } from "@/lib/ai/prompts/practice-questions";
import {
  buildComprehensiveAssessmentPrompt,
  type ComprehensiveAssessmentInput,
} from "@/lib/ai/prompts/growth-report";
import {
  computeThisWeekWeakItems,
  extractInterviewAssistantQuestions,
  buildPracticeQuestionsFromJson,
} from "@/lib/growth/practice-questions-helpers";
import { loadStudentContext, type StudentContext } from "@/lib/growth/student-context";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import type {
  GenerateReportRequest,
  GrowthReport,
  PracticeQuestion,
  WeaknessProgress,
} from "@/lib/types/growth-report";

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

/** 小論文統計を AI 総合所見プロンプト向けの1〜数行の日本語要約に整形する。 */
function formatEssaySummary(stats: GrowthReport["essayStats"]): string {
  if (stats.count === 0) return "今期間の小論文提出なし";
  const changeText = stats.scoreChange >= 0 ? `+${stats.scoreChange}` : `${stats.scoreChange}`;
  return `件数${stats.count}件・平均${stats.avgScore}点（前期間比${changeText}点）。得意カテゴリ: ${stats.bestCategory}、弱点カテゴリ: ${stats.worstCategory}`;
}

/** 面接統計を AI 総合所見プロンプト向けの1〜数行の日本語要約に整形する。 */
function formatInterviewSummary(stats: GrowthReport["interviewStats"]): string {
  if (stats.count === 0) return "今期間の面接練習なし";
  const changeText = stats.scoreChange >= 0 ? `+${stats.scoreChange}` : `${stats.scoreChange}`;
  return `件数${stats.count}件・平均${stats.avgScore}点（前期間比${changeText}点）`;
}

/** 弱点推移を「改善/停滞/悪化」でグループ化した日本語要約に整形する。 */
function formatWeaknessSummary(progress: WeaknessProgress[]): string {
  if (progress.length === 0) return "登録されている弱点なし";
  const improved = progress.filter((w) => w.status === "improved").map((w) => w.weakness);
  const stable = progress.filter((w) => w.status === "stable").map((w) => w.weakness);
  const declined = progress.filter((w) => w.status === "declined").map((w) => w.weakness);
  const parts: string[] = [];
  if (improved.length > 0) parts.push(`改善: ${improved.join("、")}`);
  if (stable.length > 0) parts.push(`停滞: ${stable.join("、")}`);
  if (declined.length > 0) parts.push(`悪化: ${declined.join("、")}`);
  return parts.length > 0 ? parts.join(" / ") : "特筆すべき変化なし";
}

/** 生徒の個別文脈 (志望校・自己分析・MBTI・資格) を1〜数行の日本語要約に整形する。取得できていなければ undefined。 */
function formatSelfAnalysisNote(ctx: StudentContext): string | undefined {
  const parts: string[] = [];
  if (ctx.primaryTargets.length > 0) {
    parts.push(
      `志望校: ${ctx.primaryTargets.map((t) => `${t.universityName}${t.facultyName}`).join("、")}`,
    );
  }
  if (ctx.mbtiType) parts.push(`MBTI: ${ctx.mbtiType}`);
  if (ctx.selfAnalysis?.apConnection) parts.push(`AP接続: ${ctx.selfAnalysis.apConnection}`);
  if (ctx.selfAnalysis?.uniqueCombo) parts.push(`強み: ${ctx.selfAnalysis.uniqueCombo}`);
  if (ctx.englishCerts.length > 0) {
    parts.push(`資格: ${ctx.englishCerts.map((c) => `${c.type}${c.score}`).join("、")}`);
  }
  return parts.length > 0 ? parts.join(" / ") : undefined;
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
    // 管理者(managedBy / 同じ塾の組織メンバー) と担当講師(assignedTeacherIds)がレポート生成可
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

    // 面談セッションの反映 (sessionDigest): 期間内セッションを直近10件に絞って要約・アクションアイテムを構築
    step = "build_session_digest";
    const sessionDigestEntries = sessionsSnap.docs
      .map((d) => {
        const data = d.data() as {
          scheduledAt?: string;
          prepPlan?: { goal?: string };
          summary?: {
            topicsDiscussed?: string[];
            actionItems?: Array<{ task?: string }>;
          };
          debrief?: { nextAgendaSeed?: string };
        };
        return {
          date: data.scheduledAt ?? "",
          goal: data.prepPlan?.goal,
          summaryPoints: data.summary?.topicsDiscussed ?? [],
          actionItems: (data.summary?.actionItems ?? [])
            .map((a) => a.task)
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0),
          nextAgenda: data.debrief?.nextAgendaSeed,
        };
      })
      // 日付だけの空/未実施セッションを除外し、内容のあるものだけを含める
      .filter(
        (e) =>
          !!e.goal ||
          e.summaryPoints.length > 0 ||
          e.actionItems.length > 0 ||
          !!e.nextAgenda,
      )
      .slice(0, 10);
    const sessionDigest: GrowthReport["sessionDigest"] =
      sessionDigestEntries.length > 0
        ? { totalCount: sessionDigestEntries.length, sessions: sessionDigestEntries }
        : undefined;

    // Phase 2: 生徒の個別文脈 (志望校・自己分析・MBTI・活動・資格) を取得。
    // AI キー有無に関わらず activitySummary の元データとして使うため、ここで常に呼ぶ。
    step = "load_student_context";
    const studentContext = await loadStudentContext(adminDb, studentId);

    // 活動実績の集計 (activitySummary): 実件数を出すため活動サブコレクションを全件取得。
    // recentActivities は loadStudentContext 内で limit(3) されるため totalCount 用には使わない。
    // 取得失敗時は recentActivities ベースにフォールバック。
    step = "fetch_activities";
    let activitySummary: GrowthReport["activitySummary"];
    try {
      const activitiesSnap = await adminDb
        .collection(`users/${studentId}/activities`)
        .orderBy("createdAt", "desc")
        .get();
      const highlights = activitiesSnap.docs
        .map((d) => (d.data() as { title?: string }).title)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .slice(0, 5);
      activitySummary =
        activitiesSnap.size > 0
          ? { totalCount: activitiesSnap.size, highlights }
          : undefined;
    } catch (err) {
      console.warn("[reports/generate] activities fetch failed, fallback to recentActivities:", err);
      activitySummary =
        studentContext.recentActivities.length > 0
          ? {
              totalCount: studentContext.recentActivities.length,
              highlights: studentContext.recentActivities
                .slice(0, 5)
                .map((a) => a.title)
                .filter((t) => t.length > 0),
            }
          : undefined;
    }

    // 出願書類の状況 (documentSummary): 失敗してもレポート本体は完成させる
    step = "fetch_documents";
    let documentSummary: GrowthReport["documentSummary"];
    try {
      const documentsSnap = await adminDb
        .collection("documents")
        .where("userId", "==", studentId)
        .get();
      const docs = documentsSnap.docs.map(
        (d) =>
          d.data() as {
            status?: string;
            title?: string;
            deadline?: string;
          },
      );
      const total = docs.length;
      const completed = docs.filter((d) => d.status === "final").length;
      const upcomingDeadlines = docs
        .filter(
          (d): d is { status?: string; title?: string; deadline: string } =>
            d.status !== "final" && typeof d.deadline === "string" && d.deadline.length > 0,
        )
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 3)
        .map((d) => ({ title: d.title ?? "", deadline: d.deadline }));
      documentSummary =
        total > 0
          ? { total, completed, inProgress: total - completed, upcomingDeadlines }
          : undefined;
    } catch (err) {
      console.warn("[reports/generate] documents fetch failed:", err);
      documentSummary = undefined;
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

    // 弱点・過去問から類題を AI 生成 (失敗してもレポート本体は完成させる)
    step = "generate_practice_questions";
    let practiceQuestions: PracticeQuestion[] | undefined;
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("[reports/generate] practice questions skipped: ANTHROPIC_API_KEY not set");
    }
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // 今週/過去をデータソースで明確に分離。プロンプトに別フィールドで渡す。
        const chronicWeaknesses = weaknessesSnap.docs
          .filter((d) => !(d.data() as { archivedAt?: unknown }).archivedAt) // Phase 4: archive 除外
          .map((d) => (d.data() as { area?: string }).area)
          .filter((a): a is string => !!a && a.length > 0)
          .slice(0, 5);

        const thisWeekEssayTopics = periodEssaysSnap.docs
          .map((d) => (d.data() as { topic?: string }).topic)
          .filter((t): t is string => !!t && t.length > 0)
          .slice(0, 5);

        const pastEssayTopics = prevEssaysSnap.docs
          .map((d) => (d.data() as { topic?: string }).topic)
          .filter((t): t is string => !!t && t.length > 0)
          .slice(0, 5);

        const thisWeekInterviewQuestions = extractInterviewAssistantQuestions(
          periodInterviewsSnap.docs,
          5,
        );

        const thisWeekWeakItems = computeThisWeekWeakItems(
          periodEssaysSnap.docs,
        );

        console.log(
          `[reports/generate] practice context: thisWeekWeakItems=${thisWeekWeakItems.length} thisWeekTopics=${thisWeekEssayTopics.length} thisWeekInterviews=${thisWeekInterviewQuestions.length} chronicWeaknesses=${chronicWeaknesses.length} pastTopics=${pastEssayTopics.length} targets=${studentContext.primaryTargets.length} hasSelfAnalysis=${!!studentContext.selfAnalysis} mbti=${studentContext.mbtiType ?? "none"} activities=${studentContext.recentActivities.length} certs=${studentContext.englishCerts.length}`,
        );

        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic();
        const systemPrompt = buildPracticeQuestionsPrompt({
          studentName: studentData.displayName ?? "生徒",
          thisWeekWeakItems,
          thisWeekEssayTopics,
          thisWeekInterviewQuestions,
          chronicWeaknesses,
          pastEssayTopics,
          studentContext,
        });
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 3500,
          system: systemPrompt,
          messages: [{ role: "user", content: "JSON のみを出力してください。" }],
        });
        const text =
          resp.content[0]?.type === "text" ? resp.content[0].text : "";
        console.log(
          `[reports/generate] practice raw response length=${text.length}`,
        );
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
          console.warn(
            "[reports/generate] practice questions: no JSON found in response",
            text.slice(0, 200),
          );
        }
        if (match) {
          const parsed = JSON.parse(match[0]) as {
            primaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
            secondaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
          };
          const combined = buildPracticeQuestionsFromJson(parsed);
          console.log(
            `[reports/generate] practice parsed=${combined.length} (primary=${parsed.primaryQuestions?.length ?? 0}, secondary=${parsed.secondaryQuestions?.length ?? 0})`,
          );
          if (combined.length > 0) practiceQuestions = combined;
        }
      } catch (err) {
        console.warn("[reports/generate] practice questions failed:", err);
      }
    }
    console.log(
      `[reports/generate] practice final count=${practiceQuestions?.length ?? 0}`,
    );

    step = "generate_report";
    // 期間別 weaknessTags 集計 (悪化/改善判定で使用)
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
      sessionSummary: sessionSummary.totalCount > 0 ? sessionSummary : undefined,
      practiceQuestions,
      sessionDigest,
      activitySummary,
      documentSummary,
    });

    // 全データ横断の AI 総合所見・推奨を生成 (失敗/キー無しならルールベース値を維持)
    step = "ai_comprehensive_assessment";
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn(
        "[reports/generate] comprehensive assessment skipped: ANTHROPIC_API_KEY not set",
      );
    }
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const comprehensiveInput: ComprehensiveAssessmentInput = {
          studentName: studentData.displayName ?? "生徒",
          period,
          essaySummary: formatEssaySummary(report.essayStats),
          interviewSummary: formatInterviewSummary(report.interviewStats),
          weaknessSummary: formatWeaknessSummary(report.weaknessProgress),
          sessionDigest: report.sessionDigest,
          activitySummary: report.activitySummary,
          documentSummary: report.documentSummary,
          selfAnalysisNote: formatSelfAnalysisNote(studentContext),
          // debrief ノートから AI 抽出済みの生徒安全な観察のみを渡す (生の notes は渡さない)
          sessionObservations:
            sessionSummary && sessionSummary.teacherObservations.length > 0
              ? sessionSummary.teacherObservations
              : undefined,
        };
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic();
        const systemPrompt = buildComprehensiveAssessmentPrompt(comprehensiveInput);
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: "JSON のみを出力してください。" }],
        });
        const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
          console.warn(
            "[reports/generate] comprehensive assessment: no JSON found in response",
          );
        } else {
          const parsed = JSON.parse(match[0]) as {
            overallAssessment?: unknown;
            recommendations?: unknown;
          };
          const isValidAssessment =
            typeof parsed.overallAssessment === "string" &&
            parsed.overallAssessment.trim().length > 0;
          const isValidRecommendations =
            Array.isArray(parsed.recommendations) &&
            parsed.recommendations.length > 0 &&
            parsed.recommendations.every(
              (r) => typeof r === "string" && r.trim().length > 0,
            );
          if (isValidAssessment && isValidRecommendations) {
            report.overallAssessment = parsed.overallAssessment as string;
            report.recommendations = parsed.recommendations as string[];
          } else {
            console.warn(
              "[reports/generate] comprehensive assessment: invalid shape, keeping rule-based values",
            );
          }
        }
      } catch (err) {
        console.warn(
          "[reports/generate] comprehensive assessment failed, keeping rule-based values:",
          err,
        );
      }
    }

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
