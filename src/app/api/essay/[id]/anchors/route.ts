import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase/admin";
import { authorizeEssayAccess } from "@/lib/api/essay-access";
import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
import {
  anchorDeterministically,
  buildAnchors,
  FEEDBACK_ANCHORS_VERSION,
  listFeedbackItems,
  needsJudge,
} from "@/lib/essay/feedback-anchors";
import { judgeFeedbackAnchors } from "@/lib/essay/feedback-anchor-judge";
import type { EssayFeedback, FeedbackAnchors } from "@/lib/types/essay";

export const maxDuration = 60;

/**
 * POST /api/essay/[id]/anchors
 *
 * 添削の指摘を本文の箇所に結び付けた結果を返す。初回だけ作って答案に保存し、
 * 2回目からは保存したものを返す（テーマ深掘りと同じ「読む人だけが1回払う」作り）。
 * 位置が計算で決まらない指摘があるときだけ AI 判定を1回呼ぶ。
 *
 * 生徒の結果画面と管理者の答案ダイアログを開いた時点で裏で呼ばれる。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 }
      );
    }
    const { id } = await params;
    const essayRef = adminDb.doc(`essays/${id}`);
    const snap = await essayRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "添削が見つかりません" },
        { status: 404 }
      );
    }
    const data = snap.data()!;
    // 生徒本人と、担当の管理者・講師だけ（作ると AI の費用が発生し、答案の中身も読むため）
    const access = await authorizeEssayAccess(request, data);
    if (access instanceof NextResponse) return access;

    const saved = data.feedbackAnchors as FeedbackAnchors | undefined;
    if (saved?.version === FEEDBACK_ANCHORS_VERSION && saved.judged) {
      return NextResponse.json({ feedbackAnchors: saved });
    }

    const text: string = data.ocrText ?? "";
    // 画面に出す指摘と同じものを結び付ける（結果APIと同じく派生の弱点を合流させる）
    const feedback = feedbackWithDerivedIssues(
      (data.feedback ?? {}) as EssayFeedback,
      data.sentenceCheck,
      { partial: isPartialEssay(data) }
    );
    const items = listFeedbackItems(feedback);
    const deterministic = anchorDeterministically(
      text,
      items,
      data.questionContext?.oralExam
    );
    const toJudge = items.filter((it) =>
      needsJudge(it, deterministic.get(it.key))
    );
    const judged =
      toJudge.length === 0
        ? new Map()
        : await judgeFeedbackAnchors({
            client: new Anthropic(),
            essayText: text,
            items: toJudge,
          });
    const anchors = buildAnchors(items, deterministic, judged);

    // AI 判定が失敗したときは保存しない（次に開いたときにもう一度試す）
    if (anchors.judged) {
      await essayRef.set({ feedbackAnchors: anchors }, { merge: true });
    }
    return NextResponse.json({ feedbackAnchors: anchors });
  } catch (error) {
    console.error("Essay anchors POST error:", error);
    return NextResponse.json(
      { error: "指摘を本文に配置できませんでした" },
      { status: 500 }
    );
  }
}
