import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { buildEssayBrushupPrompt } from "@/lib/ai/prompts/essay";
import { cleanAiText, fitToCharLimit } from "@/lib/ai/fit-char-limit";
import {
  detectJapaneseStyle,
  unifyJapaneseStyle,
} from "@/lib/ai/japanese-style";
import { AI_MODEL_REVIEW } from "@/lib/ai/prompt-versions";
import type { EssayFeedback, OralExamQuestionSet } from "@/lib/types/essay";
import { findAddedFacts } from "@/lib/essay/added-facts";
import {
  joinOralExamAnswers,
  splitOralExamAnswers,
} from "@/lib/essay/oral-exam-question";
import { generateOralExamModelAnswers } from "@/lib/essay/oral-exam-model-answer";

// 口頭試問型は問ごとに字数を詰め直すので、通常より時間がかかる
export const maxDuration = 120;

/**
 * POST /api/essay/[id]/brushup
 *
 * 添削済み essay に対して「ブラッシュアップ版」をオンデマンド生成する。
 * 既に生成済みなら idempotent に既存値を返す。 essays/{id}.feedback.brushedUpText を merge 保存。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
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
    if (data.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この添削にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // 既に生成済みならそれを返す (idempotent)
    const existing = (data.feedback as EssayFeedback | undefined)
      ?.brushedUpText;
    if (typeof existing === "string" && existing.trim().length > 0) {
      return NextResponse.json({ brushedUpText: existing, cached: true });
    }

    const ocrText: string =
      typeof data.ocrText === "string" ? data.ocrText : "";
    if (ocrText.trim().length === 0) {
      return NextResponse.json(
        { error: "本文が空のためブラッシュアップできません" },
        { status: 400 }
      );
    }

    const feedback = (data.feedback ?? {}) as EssayFeedback;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 設定が未完了です" },
        { status: 503 }
      );
    }

    const client = new Anthropic();

    /**
     * 口頭試問型は、問ごとの模範解答にする。答案全体を1本の文章として磨くと、
     * 問の区切りが消えて一続きの作文に書き直される。
     * 保存は通常と同じ brushedUpText に「問N」の見出しつきで入れる
     * （画面は問ごとに分けて出し、分けられない答案は全文で出す）。
     * 本文が小問に分けられない（手で直した等）ときは、通常の磨き方に戻す。
     */
    const oralSet: OralExamQuestionSet | undefined =
      data.questionContext?.questionType === "oral_exam"
        ? (data.questionContext?.oralExam ?? undefined)
        : undefined;
    const oralAnswers = oralSet ? splitOralExamAnswers(oralSet, ocrText) : null;
    if (oralSet && oralAnswers) {
      const models = await generateOralExamModelAnswers({
        client,
        set: oralSet,
        answers: oralAnswers,
        feedback,
      });
      if (!models) {
        return NextResponse.json(
          { error: "模範解答の生成に失敗しました" },
          { status: 502 }
        );
      }
      const modelText = joinOralExamAnswers(oralSet, models);
      // 知識の誤りを直すので原文に無い語は増える。消さずに記録だけ残す（通常と同じ）
      const addedFacts = findAddedFacts(ocrText, modelText);
      await essayRef.update({
        "feedback.brushedUpText": modelText,
        "feedback.brushedUpAddedFacts": addedFacts,
      });
      return NextResponse.json({
        brushedUpText: modelText,
        addedFacts,
        cached: false,
      });
    }

    const prompt = buildEssayBrushupPrompt(
      ocrText,
      {
        improvements: feedback.improvements,
        repeatedIssues: feedback.repeatedIssues?.map((r) => ({
          area: r.area,
          example: r.message,
        })),
      },
      // 採点に渡したのと同じ設問・資料を渡す。これが無いと、何に答える
      // 文章なのかを知らないまま磨くことになり、設問から外れて整えてしまう
      {
        topic:
          typeof data.topic === "string"
            ? data.topic
            : (data.questionContext?.title ?? undefined),
        sourceText:
          data.questionContext?.sourceText ??
          data.retryContext?.sourceText ??
          undefined,
      }
    );

    const response = await client.messages.create({
      // 全文を書き直す生成タスク。haiku では文体が混ざる・見出しが混入する事象が
      // 実データで出ていたため、添削本体と同じモデルに揃える。
      model: AI_MODEL_REVIEW,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    let brushedUpText = cleanAiText(
      response.content[0]?.type === "text" ? response.content[0].text : ""
    );

    if (!brushedUpText) {
      return NextResponse.json(
        { error: "ブラッシュアップ版の生成に失敗しました" },
        { status: 502 }
      );
    }

    // 見出しを付けるなと指示しても混入することがある（実データに
    // 「# ブラッシュアップ版本文」が残っていた）。本文の前に来る見出し行を落とす。
    brushedUpText = brushedUpText.replace(/^\s*#{1,6}[^\n]*\n+/, "").trim();

    // 文体の統一。原文が「である調」なのに添削後で敬体が混ざる事象が実データで
    // 出ていた。プロンプトに指示を足したうえで、混在していたらサーバー側で直す。
    const brushedStyle = detectJapaneseStyle(brushedUpText);
    if (brushedStyle.mixed) {
      const originalStyle = detectJapaneseStyle(ocrText);
      // 原文の文体に合わせる。原文でも判断がつかなければ小論文の既定である「である調」。
      const target = originalStyle.dominant ?? brushedStyle.dominant ?? "dearu";
      brushedUpText = await unifyJapaneseStyle(
        client,
        brushedUpText,
        target,
        AI_MODEL_REVIEW
      );
    }

    // 「元本文の±20%に収める」はプロンプトだけでは守られない（字数は他機能でも
    // 実測で守られなかった）。上限を超えた分はサーバー側で数えて詰める。
    // 下限側は「磨く」方向なので短くなっても実害がなく、詰めない。
    const upperLimit = Math.round(ocrText.length * 1.2);
    if (brushedUpText.length > upperLimit) {
      brushedUpText = await fitToCharLimit(client, brushedUpText, upperLimit);
    }

    /**
     * 原文に無い固有名詞・数値が増えていないかを見る（監査 P1-11）。
     * プロンプトで禁じても破られることがあり、ブラッシュアップ版は生徒が
     * そのまま提出しうる。消さずに、増えた語を添えて本人に確認させる。
     */
    const addedFacts = findAddedFacts(ocrText, brushedUpText);
    if (addedFacts.length > 0) {
      console.warn(
        `[essay/brushup] ${id}: 原文に無い語が増えた:`,
        addedFacts.join(" / ")
      );
    }

    await essayRef.update({
      "feedback.brushedUpText": brushedUpText,
      "feedback.brushedUpAddedFacts": addedFacts,
    });

    return NextResponse.json({ brushedUpText, addedFacts, cached: false });
  } catch (error) {
    console.error("[essay/brushup] error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "ブラッシュアップ版の生成に失敗しました", detail },
      { status: 500 }
    );
  }
}
