import { NextRequest, NextResponse } from "next/server";
import { reviewWithClaude, buildMockReviewResult } from "@/lib/ai/essay-reviewer";
import { buildSkillCheckPrompt } from "@/lib/ai/prompts/skill-check";
import { getQuestionById } from "@/lib/skill-check/questions";
import { calculateRank } from "@/lib/skill-check/rank";
import { calculateFillRate } from "@/lib/essay/review-metrics";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
import type { AcademicCategory, SkillCheckResult } from "@/lib/types/skill-check";
import { ACADEMIC_CATEGORIES } from "@/lib/types/skill-check";
import type { WeaknessRecord } from "@/lib/types/growth";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";

export const maxDuration = 120;

interface SubmitBody {
  questionId: string;
  category: AcademicCategory;
  essayText: string;
  durationSec: number;
}

export async function POST(request: NextRequest) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }
  const { questionId, category, essayText, durationSec } = body;

  if (!questionId || !category || !essayText) {
    return NextResponse.json({ error: "必須フィールド不足" }, { status: 400 });
  }
  if (!ACADEMIC_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "無効な系統" }, { status: 400 });
  }
  const question = getQuestionById(questionId);
  if (!question || question.category !== category) {
    return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
  }
  if (essayText.length < 100) {
    return NextResponse.json({ error: "本文が短すぎます（100字以上必要）" }, { status: 400 });
  }

  // ユーザー識別
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") {
    userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // AI採点（未設定時はモック）
  // 充足率はサーバーで計算して渡す。モデルに字数を数えさせると「7割未満なら減点」の
  // 判定が安定しない（プロンプト側は wordLimit を受け取っていなかった）。
  const fillRate = calculateFillRate(essayText, question.wordLimit);
  const systemPrompt = buildSkillCheckPrompt(question, { fillRate });
  const userMessage = `【問題】${question.title}\n${question.prompt}\n\n<essay_under_review>\n${essayText}\n</essay_under_review>`;

  let reviewResult;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      reviewResult = await reviewWithClaude({ systemPrompt, userMessage });
    } else {
      reviewResult = buildMockReviewResult(essayText);
    }
  } catch (err) {
    console.error("Skill check review error:", err);
    return NextResponse.json({ error: "AI採点でエラーが発生しました" }, { status: 500 });
  }

  const { scores, feedback } = reviewResult;
  const rank = calculateRank(scores.total);
  const takenAt = new Date();

  // Firestore保存
  const { adminDb } = await import("@/lib/firebase/admin");
  let resultId = `mock-${Date.now()}`;

  if (!adminDb) {
    console.error("[skill-check/submit] adminDb is null — Firebase Admin SDK not initialized");
    return NextResponse.json(
      { error: "サーバー側の設定不備により保存できませんでした" },
      { status: 500 },
    );
  }

  const { FieldValue } = await import("firebase-admin/firestore");

  // Firestore は undefined を許容しないので除去
  const sanitize = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

  // 重要書き込み: skillCheck 本体 (失敗したら 500)
  try {
    const docRef = await adminDb.collection(`users/${userId}/skillChecks`).add({
      userId,
      category,
      questionId,
      essayText,
      wordCount: essayText.length,
      durationSec: durationSec ?? 0,
      scores: sanitize(scores),
      rank,
      feedback: sanitize(feedback),
      takenAt: FieldValue.serverTimestamp(),
      version: "v1",
      // 採点プロンプトの版。アンカーを変えるとスコア水準が動くため、
      // どの基準で付いた点かを後から判別できるように記録する。
      aiMetadata: {
        ...AI_PROMPT_VERSIONS.skillCheck,
        model: AI_MODEL_REVIEW,
      },
    });
    resultId = docRef.id;
  } catch (err) {
    console.error("[skill-check/submit] Failed to write skillCheck doc:", err);
    return NextResponse.json(
      { error: "スキルチェック結果の保存に失敗しました" },
      { status: 500 },
    );
  }

  // 補助書き込み: user doc + 弱点 (失敗しても skillCheck 自体は保存済みなので続行)
  // SC 原値は lastSkillCheckScore に保持、currentSkillScore/Rank は後で aggregate で更新
  try {
    await adminDb.doc(`users/${userId}`).set(
      {
        skillCheckCompleted: true,
        lastSkillCheckedAt: FieldValue.serverTimestamp(),
        lastSkillCheckScore: scores.total,
        lastSkillCheckRank: rank,
        academicCategory: category,
      },
      { merge: true },
    );
    // aggregate 再計算: 直近30日 essays と SC 原値の合成で currentSkillScore/Rank を更新
    const { refreshEssayAggregateCache } = await import(
      "@/lib/skill-check/aggregate"
    );
    void refreshEssayAggregateCache(userId).catch((e) =>
      console.warn("[skill-check/submit] aggregate refresh failed:", e),
    );
  } catch (err) {
    console.error("[skill-check/submit] Failed to update user doc:", err);
  }

  try {
    const weaknessTags = [
      ...feedback.repeatedIssues.map((r) => r.area),
      ...feedback.improvements,
    ];
    if (weaknessTags.length > 0) {
      const existingSnap = await adminDb
        .collection(`users/${userId}/weaknesses`)
        .where("resolved", "==", false)
        .get();
      const existing: WeaknessRecord[] = existingSnap.docs.map((d) => {
        const w = d.data();
        return {
          area: w.area,
          count: w.count ?? 0,
          firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
          lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
          improving: w.improving ?? false,
          resolved: w.resolved ?? false,
          source: w.source ?? "essay",
          reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
        };
      });
      const updated = updateWeaknessRecords(existing, weaknessTags, "skill_check");
      for (const w of updated) {
        await adminDb.doc(`users/${userId}/weaknesses/${w.area}`).set(
          {
            area: w.area,
            count: w.count,
            firstOccurred: w.firstOccurred,
            lastOccurred: w.lastOccurred,
            improving: w.improving,
            resolved: w.resolved,
            source: w.source,
            reminderDismissedAt: w.reminderDismissedAt,
          },
          { merge: true },
        );
      }
      void analyzeGrowth(weaknessTags, existing);
    }
  } catch (err) {
    console.error("[skill-check/submit] Failed to update weaknesses:", err);
  }

  const result: SkillCheckResult = {
    id: resultId,
    userId,
    category,
    questionId,
    essayText,
    wordCount: essayText.length,
    durationSec: durationSec ?? 0,
    scores,
    rank,
    feedback,
    takenAt,
    version: "v1",
  };

  return NextResponse.json({ result });
}
