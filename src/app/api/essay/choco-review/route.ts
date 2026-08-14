import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getChocoPassageById } from "@/data/choco-passages";
import { reviewChocoParagraph } from "@/lib/essay/choco-core";
import { computeChocoTotal } from "@/lib/choco/score";
import { applyChocoWeaknesses } from "@/lib/choco/apply-weakness";
import type { ChocoReview } from "@/lib/types/choco";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { passageId, blankIndex, studentText } = await request.json();
  if (typeof passageId !== "string" || typeof blankIndex !== "number" || !studentText?.trim()) {
    return NextResponse.json({ error: "passageId / blankIndex / studentText が必要です" }, { status: 400 });
  }
  if (studentText.length > 2000) {
    return NextResponse.json({ error: "文章が長すぎます（2000字以内）" }, { status: 400 });
  }

  const passage = getChocoPassageById(passageId);
  if (!passage || blankIndex < 0 || blankIndex >= passage.paragraphs.length) {
    return NextResponse.json({ error: "本文が見つかりません" }, { status: 400 });
  }
  const target = passage.paragraphs[blankIndex];

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEYが設定されていません" }, { status: 503 });
  }

  let evaluation;
  try {
    evaluation = await reviewChocoParagraph({ paragraphs: passage.paragraphs, blankIndex, studentText });
  } catch (err) {
    console.error("[choco-review] AI failed:", err);
    return NextResponse.json({ error: "添削に失敗しました。もう一度お試しください。" }, { status: 500 });
  }

  const scores = { ...evaluation.scores, total: computeChocoTotal(evaluation.scores) };
  const now = new Date().toISOString();

  const { adminDb } = await import("@/lib/firebase/admin");
  let reviewId = "local";
  if (adminDb) {
    const ref = adminDb.collection(`users/${uid}/chokoReviews`).doc();
    reviewId = ref.id;
    const doc: ChocoReview = {
      id: reviewId,
      userId: uid,
      passageId: passage.id,
      facultyKey: passage.facultyKey,
      themeTitle: passage.themeTitle,
      blankIndex,
      role: target.role,
      studentText,
      modelText: target.text,
      keyPoints: target.keyPoints,
      scores,
      feedback: evaluation.feedback,
      wordCount: studentText.length,
      submittedAt: now,
      createdAt: now,
    };
    // 採点プロンプトの版。基準を変えるとスコア水準が動くため、どの基準で付いた点かを
    // 後から判別できるように記録する。
    await ref.set({
      ...doc,
      aiMetadata: {
        ...AI_PROMPT_VERSIONS.chocoReview,
        model: AI_MODEL_REVIEW,
      },
    });

    // 弱点DB反映は応答前に await する（fire-and-forget だと応答後にインスタンスが凍結して
    // 反映が失われうるため）。失敗しても catch して結果は返す。
    try {
      await applyChocoWeaknesses(uid, evaluation.feedback.weaknessTags);
    } catch (e) {
      console.warn("[choco-review] weakness apply failed:", e);
    }
    void import("@/lib/skill-check/aggregate")
      .then(({ refreshEssayAggregateCache }) => refreshEssayAggregateCache(uid))
      .catch((e) => console.warn("[choco-review] aggregate refresh failed:", e));
    void import("@/lib/bigquery/logger")
      .then(({ logEssaySubmission }) =>
        logEssaySubmission({
          essay_id: reviewId,
          user_id: uid,
          university_id: "",
          faculty_id: passage.facultyKey,
          submitted_at: now,
          // つながりは本添削の「構成」に対応する。1段落だけの練習では
          // AP合致度・独自性・議論の成熟度を採点できないので null にする
          // （0を入れると BQ の AVG が実際より低く出る）
          score_structure: evaluation.scores.coherence,
          score_logic: evaluation.scores.logic,
          score_expression: evaluation.scores.expression,
          score_ap_alignment: null,
          score_originality: null,
          score_total: scores.total,
          word_count: studentText.length,
          topic: passage.themeTitle,
          weakness_tags: evaluation.feedback.weaknessTags,
          improvement_tags: evaluation.feedback.improvements,
          essay_type: "choco",
        }),
      )
      .catch((e) => console.warn("[choco-review] BQ log failed:", e));
  }

  return NextResponse.json({
    id: reviewId,
    scores,
    feedback: evaluation.feedback,
    modelText: target.text,
    keyPoints: target.keyPoints,
    role: target.role,
    blankIndex,
  });
}
