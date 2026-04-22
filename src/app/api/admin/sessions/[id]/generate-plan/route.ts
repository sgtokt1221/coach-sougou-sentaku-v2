import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  assertSessionAccess,
  getPreviousSession,
} from "@/lib/api/session-auth";
import {
  buildLessonPlanPrompt,
  type LessonPlanContext,
} from "@/lib/ai/prompts/lesson-plan";
import type {
  Session,
  LessonPrepPlan,
} from "@/lib/types/session";
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
  const [saSnap, weakSnap, essaysSnap, coachThreadsSnap, prevSession] =
    await Promise.all([
      adminDb.doc(`selfAnalysis/${studentId}`).get(),
      adminDb
        .collection(`users/${studentId}/weaknesses`)
        .orderBy("count", "desc")
        .limit(5)
        .get(),
      adminDb
        .collection(`users/${studentId}/essays`)
        .orderBy("createdAt", "desc")
        .limit(3)
        .get()
        .catch(() => null),
      adminDb
        .collection(`users/${studentId}/essayCoachThreads`)
        .orderBy("updatedAt", "desc")
        .limit(1)
        .get()
        .catch(() => null),
      getPreviousSession(adminDb, studentId, session.scheduledAt),
    ]);

  const sa = saSnap.exists ? saSnap.data() : null;
  const topWeaknesses = weakSnap.docs.map((d) => {
    const w = d.data() as WeaknessRecord;
    return {
      area: w.area ?? d.id,
      count: typeof w.count === "number" ? w.count : 1,
      source: w.source ?? "unknown",
    };
  });
  const recentEssayFeedback: string[] = essaysSnap
    ? essaysSnap.docs.map((d) => {
        const data = d.data() as { feedback?: string; overallComment?: string };
        return data.overallComment ?? data.feedback ?? "";
      }).filter(Boolean)
    : [];
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

  const hasAnyData =
    Boolean(sa) ||
    topWeaknesses.length > 0 ||
    recentEssayFeedback.length > 0 ||
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
        }
      : undefined,
    previousPrepGoal: prevSession?.prepPlan?.goal,
  };

  // 全データ空なら「新しい生徒モード」を示す
  const systemPrompt = buildLessonPlanPrompt(ctx) + (hasAnyData ? "" : "\n\n【注意】この生徒はまだ自己分析も弱点記録も揃っていません。初回なので、生徒の経験や価値観を引き出す質問 (自己紹介に近いもの) を中心に組み立ててください。");

  let rawText = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
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

  // JSON 抽出
  let parsed: { goal?: string; questions?: string[]; cautions?: string[] } | null = null;
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || !parsed.goal || !Array.isArray(parsed.questions)) {
    return NextResponse.json(
      { error: "AI レスポンスの解析に失敗しました" },
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

  await adminDb.doc(`sessions/${id}`).set({ prepPlan, updatedAt: new Date().toISOString() }, { merge: true });

  return NextResponse.json({ prepPlan });
}
