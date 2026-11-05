import { NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import {
  buildFeedbackDraftPrompt,
  FEEDBACK_DRAFT_TONES,
  type FeedbackDraftTone,
} from "@/lib/ai/prompts/essay-feedback-draft";
import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
import { pickFocus } from "@/lib/essay/result-focus";
import { weaknessCountOf } from "@/lib/growth/weakness-count";
import { loadWeaknessRecords } from "@/lib/growth/weakness-store";
import type { EssayFeedback, EssayScores } from "@/lib/types/essay";

export const maxDuration = 60;

/**
 * POST /api/admin/students/[id]/essays/[essayId]/feedback-draft
 * 答案の添削結果から、講師が生徒へ送るフィードバックの下書きを作る（保存はしない）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id: studentId, essayId } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI 機能は現在利用できません" },
      { status: 503 }
    );
  }
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { tone?: string };
  const tone: FeedbackDraftTone = FEEDBACK_DRAFT_TONES.includes(
    body.tone as FeedbackDraftTone
  )
    ? (body.tone as FeedbackDraftTone)
    : "default";

  // 答案詳細と同じゲート（他塾の生徒の答案を AI に流さない）
  const userDoc = await adminDb.doc(`users/${studentId}`).get();
  const userData = userDoc.data();
  const denied = await scopeByOrganization({
    requesterUid: auth.uid,
    requesterRole: auth.role,
    studentUid: studentId,
    studentData: {
      managedBy: userData?.managedBy,
      organizationId: userData?.organizationId,
      assignedTeacherIds: getAssignedTeacherIds(userData),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  const essayDoc = await adminDb.doc(`essays/${essayId}`).get();
  const data = essayDoc.data();
  if (!data || data.userId !== studentId || !data.feedback) {
    return NextResponse.json(
      { error: "添削結果のある答案が見つかりません" },
      { status: 404 }
    );
  }

  const feedback = feedbackWithDerivedIssues(
    data.feedback as EssayFeedback,
    data.sentenceCheck,
    { partial: isPartialEssay(data) }
  );
  const scores = data.scores as EssayScores | undefined;

  // 前回からの点差（書き直しなら親）
  let totalDelta: number | null = null;
  if (data.parentEssayId && typeof scores?.total === "number") {
    const parent = await adminDb.doc(`essays/${data.parentEssayId}`).get();
    const pt = parent.data()?.scores?.total;
    if (typeof pt === "number") totalDelta = scores.total - pt;
  }

  // 繰り返している弱点（弱点DBでの回数つき。2回以上だけ）
  const { records } = await loadWeaknessRecords(adminDb, studentId);
  const seen = new Set<string>();
  const repeatedWeaknesses = (feedback.repeatedIssues ?? []).flatMap((issue) => {
    const hit = weaknessCountOf(issue, records);
    if (!hit || hit.count < 2 || seen.has(hit.label)) return [];
    seen.add(hit.label);
    return [hit];
  });

  const pfc = feedback.previousFocusCheck;
  const prompt = buildFeedbackDraftPrompt(
    {
      studentName:
        (userData?.displayName as string | undefined)?.trim() || "あなた",
      topic: (data.topic as string | undefined) ?? "",
      attemptNumber:
        typeof data.attemptNumber === "number" ? data.attemptNumber : 1,
      focus: pickFocus(feedback)?.text ?? null,
      improvements: (feedback.improvements ?? []).slice(0, 3),
      goodPoints: (feedback.goodPoints ?? []).slice(0, 3),
      previousFocus: pfc
        ? { focus: pfc.focus, status: pfc.status, evidence: pfc.evidence }
        : null,
      repeatedWeaknesses,
      totalDelta,
      total: typeof scores?.total === "number" ? scores.total : null,
      scoreMaximum: feedback.scoreMaximum ?? 50,
    },
    tone
  );

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const res = await client.messages.create({
      model: AI_MODEL_SONNET,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "下書きが長くなりすぎました。もう一度押してください" },
        { status: 502 }
      );
    }
    const draft = res.content
      .flatMap((c) => (c.type === "text" ? [c.text] : []))
      .join("")
      .trim();
    if (!draft) {
      return NextResponse.json(
        { error: "下書きを作れませんでした" },
        { status: 502 }
      );
    }
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[feedback-draft] failed:", err);
    return NextResponse.json(
      { error: "下書きを作れませんでした" },
      { status: 502 }
    );
  }
}
