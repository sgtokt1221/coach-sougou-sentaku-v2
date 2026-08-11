import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  assertSessionAccess,
  getPreviousSessionWithAbsences,
} from "@/lib/api/session-auth";
import { getSessionPeriodArtifacts } from "@/lib/api/session-artifacts";
import {
  buildLessonPlanPrompt,
  type LessonPlanContext,
} from "@/lib/ai/prompts/lesson-plan";
import { buildPracticeQuestionsPrompt } from "@/lib/ai/prompts/practice-questions";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import {
  computeThisWeekWeakItems,
  extractInterviewAssistantQuestions,
  buildPracticeQuestionsFromJson,
} from "@/lib/growth/practice-questions-helpers";
import { getPeriodRange } from "@/lib/growth/report";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import { loadStudentContext } from "@/lib/growth/student-context";
import { extractJsonObject } from "@/lib/ai/extract-json";
import { toDateSafe } from "@/lib/firebase/timestamp";
import type {
  Session,
  LessonPrepPlan,
} from "@/lib/types/session";
import type { PracticeQuestion } from "@/lib/types/growth-report";
import type { WeaknessRecord } from "@/lib/types/growth";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI 機能は現在利用できません" },
      { status: 503 },
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const sessionSnap = await adminDb.doc(`sessions/${id}`).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: sessionSnap.id, ...sessionSnap.data() } as Session;

  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (session.type === "group_review") {
    return NextResponse.json(
      { error: "グループセッションは未対応です (1 対 1 のみ)" },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    regenerate?: boolean;
  };

  // 並列取得
  const studentId = session.studentId;
  const [
    saSnap,
    weakSnap,
    essaysSnap,
    coachThreadsSnap,
    prevResult,
    studentSnap,
    essaySkillSnap,
    interviewSkillSnap,
  ] = await Promise.all([
    adminDb.doc(`selfAnalysis/${studentId}`).get(),
    // Phase 4: archive を考慮して多めに取り、 後段で filter + slice
    adminDb
      .collection(`users/${studentId}/weaknesses`)
      .orderBy("count", "desc")
      .limit(15)
      .get(),
    // essays はグローバル collection（userId で絞り込み）。subcollection は実体が無く空振りしていたため是正
    adminDb
      .collection("essays")
      .where("userId", "==", studentId)
      .get()
      .catch(() => null),
    adminDb
      .collection(`users/${studentId}/essayCoachThreads`)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get()
      .catch(() => null),
    getPreviousSessionWithAbsences(adminDb, studentId, session.scheduledAt),
    // 志望校解決用に生徒プロフィール
    adminDb.doc(`users/${studentId}`).get().catch(() => null),
    // 最新スキルチェック (小論文 / 面接)
    adminDb
      .collection(`users/${studentId}/skillChecks`)
      .orderBy("takenAt", "desc")
      .limit(1)
      .get()
      .catch(() => null),
    adminDb
      .collection(`users/${studentId}/interviewSkillChecks`)
      .orderBy("takenAt", "desc")
      .limit(1)
      .get()
      .catch(() => null),
  ]);

  // 欠席回は飛ばして「直近の実施回」を前回とする。欠席回に準備してあった台本は
  // 未消化の内容なので、今回の台本で扱わせるため別途 AI に渡す。
  const prevSession = prevResult.session;
  const missedPreps = prevResult.missedSessions
    .map((s) => ({
      date: s.scheduledAt.slice(0, 10),
      theme: s.prepPlan?.theme ?? s.theme ?? "",
      goal: s.prepPlan?.goal ?? "",
      questions: s.prepPlan?.questions ?? [],
    }))
    .filter((m) => m.theme || m.goal || m.questions.length > 0);

  const sa = saSnap.exists ? saSnap.data() : null;
  const topWeaknesses = weakSnap.docs
    .filter((d) => !(d.data() as { archivedAt?: unknown }).archivedAt) // Phase 4: archive 除外
    .slice(0, 5)
    .map((d) => {
      const w = d.data() as WeaknessRecord;
      return {
        area: w.area ?? d.id,
        count: typeof w.count === "number" ? w.count : 1,
        source: w.source ?? "unknown",
      };
    });
  const recentEssayFeedback: string[] = essaysSnap
    ? essaysSnap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .sort((a, b) => {
          const ta = new Date(String(a.submittedAt ?? 0)).getTime();
          const tb = new Date(String(b.submittedAt ?? 0)).getTime();
          return tb - ta;
        })
        .slice(0, 3)
        .map((data) => {
          const oc = data.overallComment;
          if (typeof oc === "string" && oc) return oc;
          const fb = data.feedback as { overallComment?: string } | string | undefined;
          if (typeof fb === "string") return fb;
          if (fb && typeof fb === "object" && typeof fb.overallComment === "string") return fb.overallComment;
          return "";
        })
        .filter(Boolean)
    : [];

  // 前回〜今回の成果物サマリー（面接/書類/活動/スキルチェック/成長レポート）をAI入力に追加
  let recentArtifactsSummary: string | undefined;
  try {
    const pa = await getSessionPeriodArtifacts(adminDb, studentId, session);
    const lines: string[] = [];
    if (pa.artifacts.interviews.length) {
      lines.push(
        `模擬面接 ${pa.artifacts.interviews.length}件（平均${pa.scoreSummary.interview.avg ?? "—"}点）: ` +
          pa.artifacts.interviews.map((i) => i.label).join("、"),
      );
    }
    if (pa.artifacts.documents.length) {
      lines.push(`出願書類: ${pa.artifacts.documents.map((d) => `${d.label}(${d.status ?? "?"})`).join("、")}`);
    }
    if (pa.artifacts.activities.length) {
      lines.push(`活動実績: ${pa.artifacts.activities.map((a) => a.label).join("、")}`);
    }
    if (pa.artifacts.skillChecks.length) {
      lines.push(`スキルチェック: ${pa.artifacts.skillChecks.map((s) => `${s.label}${s.rank ? `(${s.rank})` : ""}`).join("、")}`);
    }
    if (pa.artifacts.reports.length) {
      lines.push(`成長レポート: ${pa.artifacts.reports.map((r) => r.sub ?? r.label).join(" / ")}`);
    }
    recentArtifactsSummary = lines.length ? lines.join("\n") : undefined;
  } catch (err) {
    console.warn("[generate-plan] artifacts summary failed:", err);
  }
  const recentCoachDialogSnippet =
    coachThreadsSnap && !coachThreadsSnap.empty
      ? (() => {
          const thread = coachThreadsSnap.docs[0].data() as {
            messages?: Array<{ role: string; content: string }>;
          };
          const msgs = Array.isArray(thread.messages) ? thread.messages : [];
          return msgs
            .slice(-6)
            .map((m) => `[${m.role}] ${m.content.slice(0, 120)}`)
            .join("\n");
        })()
      : undefined;

  // 志望校 AP (上位 3 校。compoundId = "universityId:facultyId")
  let admissionPolicies: Array<{ name: string; ap: string }> | undefined;
  try {
    const targetUniversities =
      (studentSnap?.exists
        ? (studentSnap.data() as { targetUniversities?: string[] }).targetUniversities
        : undefined) ?? [];
    const compoundIds = targetUniversities.slice(0, 3);
    const resolved = await Promise.all(
      compoundIds.map(async (compoundId) => {
        const [universityId, facultyId] = compoundId.split(":");
        if (!universityId) return null;
        const uniDoc = await adminDb.doc(`universities/${universityId}`).get();
        if (!uniDoc.exists) return null;
        const uni = uniDoc.data() as {
          name?: string;
          faculties?: Array<{ id: string; name: string; admissionPolicy?: string }>;
        };
        const faculty = uni.faculties?.find((f) => f.id === facultyId);
        if (!faculty?.admissionPolicy) return null;
        return {
          name: `${uni.name ?? universityId} ${faculty.name}`,
          ap: faculty.admissionPolicy,
        };
      }),
    );
    const filtered = resolved.filter(
      (r): r is { name: string; ap: string } => r !== null,
    );
    admissionPolicies = filtered.length > 0 ? filtered : undefined;
  } catch (err) {
    console.warn("[generate-plan] AP resolution failed:", err);
  }

  // 最新スキルチェック (rank + total)
  let latestSkill: LessonPlanContext["latestSkill"];
  const essaySkill = essaySkillSnap && !essaySkillSnap.empty
    ? (essaySkillSnap.docs[0].data() as {
        rank?: string;
        scores?: { total?: number };
      })
    : null;
  const interviewSkill = interviewSkillSnap && !interviewSkillSnap.empty
    ? (interviewSkillSnap.docs[0].data() as {
        rank?: string;
        scores?: { total?: number };
      })
    : null;
  if (essaySkill || interviewSkill) {
    latestSkill = {
      essayRank: essaySkill?.rank,
      essayScore: essaySkill?.scores?.total,
      interviewRank: interviewSkill?.rank,
      interviewScore: interviewSkill?.scores?.total,
    };
  }

  const hasAnyData =
    Boolean(sa) ||
    topWeaknesses.length > 0 ||
    recentEssayFeedback.length > 0 ||
    Boolean(recentArtifactsSummary) ||
    Boolean(prevSession?.debrief);

  const ctx: LessonPlanContext = {
    studentName: session.studentName || "生徒",
    sessionType: session.type,
    currentPlan: body.regenerate && session.prepPlan ? session.prepPlan : undefined,
    selfAnalysis: sa
      ? {
          coreValues: (sa as { values?: { coreValues?: string[] } }).values?.coreValues,
          strengths: (sa as { strengths?: { strengths?: string[] } }).strengths?.strengths,
          interests: (sa as { interests?: { fields?: string[] } }).interests?.fields,
          longTermVision: (sa as { vision?: { longTermVision?: string } }).vision?.longTermVision,
        }
      : undefined,
    topWeaknesses,
    recentEssayFeedback,
    recentCoachDialogSnippet,
    previousDebrief: prevSession?.debrief
      ? {
          notes: prevSession.debrief.notes ?? "",
          nextAgendaSeed: prevSession.debrief.nextAgendaSeed ?? "",
          newWeaknessAreas: prevSession.debrief.newWeaknessAreas ?? [],
          reflectionPoints: prevSession.debrief.reflectionPoints ?? [],
        }
      : undefined,
    previousPrepGoal: prevSession?.prepPlan?.goal,
    missedPreps,
    recentArtifactsSummary,
    admissionPolicies,
    latestSkill,
  };

  // 全データ空なら「新しい生徒モード」を示す
  const systemPrompt = buildLessonPlanPrompt(ctx) + (hasAnyData ? "" : "\n\n【注意】この生徒はまだ自己分析も弱点記録も揃っていません。初回なので、生徒の経験や価値観を引き出す質問 (自己紹介に近いもの) を中心に組み立ててください。");

  let rawText = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: AI_MODEL_SONNET,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "上記を踏まえ、今日の授業台本 (JSON) を出力してください。",
        },
      ],
    });
    rawText = resp.content[0]?.type === "text" ? resp.content[0].text : "";
  } catch (err) {
    console.error("[generate-plan] Claude call failed:", err);
    return NextResponse.json({ error: "AI 生成に失敗しました" }, { status: 500 });
  }

  // JSON 抽出 (フェンス有無・前後の説明文・部分的な切れに耐性を持たせる)
  let parsed:
    | { theme?: string; goal?: string; questions?: string[]; cautions?: string[] }
    | null = null;
  const jsonStr = extractJsonObject(rawText);
  if (jsonStr) {
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || !parsed.goal || !Array.isArray(parsed.questions)) {
    console.error(
      `[generate-plan] 台本 JSON parse failed. rawLength=${rawText.length} snippet=${rawText.slice(0, 200)}`,
    );
    return NextResponse.json(
      {
        error: "AI レスポンスの解析に失敗しました",
        detail: `rawLength=${rawText.length}`,
      },
      { status: 500 },
    );
  }

  const prepPlan: LessonPrepPlan = {
    goal: String(parsed.goal).slice(0, 500),
    questions: (parsed.questions ?? []).map((q) => String(q).slice(0, 300)).slice(0, 10),
    cautions: Array.isArray(parsed.cautions)
      ? parsed.cautions.map((c) => String(c).slice(0, 300)).slice(0, 8)
      : [],
    generatedAt: new Date().toISOString(),
    generatedBy: "ai",
  };
  if (typeof parsed.theme === "string" && parsed.theme.trim()) {
    prepPlan.theme = parsed.theme.slice(0, 200);
  }

  // 2 段階目: 「今日使う類題」を生成 (台本とセット)。
  // 期間スコープは「前回セッション scheduledAt 〜 今回 scheduledAt」。
  // 失敗しても台本は保存する (致命的でない)。
  let practiceQuestions: PracticeQuestion[] = [];
  let practiceQuestionsError: string | undefined;
  try {
    const endDate = new Date(session.scheduledAt);
    const startDate = prevSession?.scheduledAt
      ? new Date(prevSession.scheduledAt)
      : getPeriodRange("weekly").start;

    const [periodEssaysSnap, periodInterviewsSnap] = await Promise.all([
      queryWithRangeFilter(
        adminDb.collection("essays"),
        "userId",
        studentId,
        "submittedAt",
        startDate,
        endDate,
      ),
      queryWithRangeFilter(
        adminDb.collection("interviews"),
        "userId",
        studentId,
        "startedAt",
        startDate,
        endDate,
      ),
    ]);

    const thisWeekWeakItems = computeThisWeekWeakItems(periodEssaysSnap.docs);
    const thisWeekEssayTopics = periodEssaysSnap.docs
      .map((d) => (d.data() as { topic?: string }).topic)
      .filter((t): t is string => !!t && t.length > 0)
      .slice(0, 5);
    const thisWeekInterviewQuestions = extractInterviewAssistantQuestions(
      periodInterviewsSnap.docs,
      5,
    );
    // chronic は既取得の topWeaknesses (archive 除外済み上位 5) を流用
    const chronicWeaknesses = topWeaknesses.map((w) => w.area);
    // 過去テーマ (期間外) は既取得の essaysSnap から抽出
    const startMs = startDate.getTime();
    const pastEssayTopics = essaysSnap
      ? essaysSnap.docs
          .filter((d) => {
            const ts = toDateSafe((d.data() as { submittedAt?: unknown }).submittedAt);
            return ts ? ts.getTime() < startMs : false;
          })
          .map((d) => (d.data() as { topic?: string }).topic)
          .filter((t): t is string => !!t && t.length > 0)
          .slice(0, 5)
      : [];
    const studentContext = await loadStudentContext(adminDb, studentId);

    const pqSystem = buildPracticeQuestionsPrompt({
      studentName: session.studentName || "生徒",
      thisWeekWeakItems,
      thisWeekEssayTopics,
      thisWeekInterviewQuestions,
      chronicWeaknesses,
      pastEssayTopics,
      studentContext,
    });
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const pqResp = await client.messages.create({
      // 生徒がそのまま解く練習問題を作る。8000トークン規模の長文生成で、
      // 出題文の質がそのまま指導の質になるため上位モデルを使う。
      model: AI_MODEL_SONNET,
      max_tokens: 8000,
      system: pqSystem,
      messages: [{ role: "user", content: "JSON のみを出力してください。" }],
    });
    // stop_reason が max_tokens の場合、JSON が途中で切れている可能性が高い
    const truncated = pqResp.stop_reason === "max_tokens";
    const pqText = pqResp.content[0]?.type === "text" ? pqResp.content[0].text : "";
    const pqJsonStr = extractJsonObject(pqText);
    if (pqJsonStr) {
      practiceQuestions = buildPracticeQuestionsFromJson(JSON.parse(pqJsonStr));
      if (practiceQuestions.length === 0) {
        practiceQuestionsError = "AIが有効な類題を返しませんでした。再生成をお試しください。";
      }
    } else {
      console.warn(
        `[generate-plan] practice questions JSON not found. rawLength=${pqText.length} truncated=${truncated}`,
      );
      practiceQuestionsError = truncated
        ? "類題の生成が長すぎて途中で切れました。再生成をお試しください。"
        : "類題データの解析に失敗しました。再生成をお試しください。";
    }
  } catch (err) {
    console.warn("[generate-plan] practice questions generation failed:", err);
    practiceQuestionsError = "類題の生成に失敗しました。再生成をお試しください。";
  }

  await adminDb
    .doc(`sessions/${id}`)
    .set(
      { prepPlan, practiceQuestions, updatedAt: new Date().toISOString() },
      { merge: true },
    );

  return NextResponse.json({ prepPlan, practiceQuestions, practiceQuestionsError });
}
