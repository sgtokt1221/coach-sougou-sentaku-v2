import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { buildEssayBrushupPrompt } from "@/lib/ai/prompts/essay";
import type { EssayFeedback } from "@/lib/types/essay";

export const maxDuration = 60;

/**
 * POST /api/essay/[id]/brushup
 *
 * 添削済み essay に対して「ブラッシュアップ版」をオンデマンド生成する。
 * 既に生成済みなら idempotent に既存値を返す。 essays/{id}.feedback.brushedUpText を merge 保存。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 },
      );
    }

    const { id } = await params;
    const essayRef = adminDb.doc(`essays/${id}`);
    const snap = await essayRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "添削が見つかりません" },
        { status: 404 },
      );
    }
    const data = snap.data()!;
    if (data.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この添削にアクセスする権限がありません" },
        { status: 403 },
      );
    }

    // 既に生成済みならそれを返す (idempotent)
    const existing = (data.feedback as EssayFeedback | undefined)?.brushedUpText;
    if (typeof existing === "string" && existing.trim().length > 0) {
      return NextResponse.json({ brushedUpText: existing, cached: true });
    }

    const ocrText: string = typeof data.ocrText === "string" ? data.ocrText : "";
    if (ocrText.trim().length === 0) {
      return NextResponse.json(
        { error: "本文が空のためブラッシュアップできません" },
        { status: 400 },
      );
    }

    const feedback = (data.feedback ?? {}) as EssayFeedback;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 設定が未完了です" },
        { status: 503 },
      );
    }

    const prompt = buildEssayBrushupPrompt(ocrText, {
      improvements: feedback.improvements,
      repeatedIssues: feedback.repeatedIssues?.map((r) => ({
        area: r.area,
        example: r.message,
      })),
    });

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const brushedUpText =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";

    if (!brushedUpText) {
      return NextResponse.json(
        { error: "ブラッシュアップ版の生成に失敗しました" },
        { status: 502 },
      );
    }

    await essayRef.update({
      "feedback.brushedUpText": brushedUpText,
    });

    return NextResponse.json({ brushedUpText, cached: false });
  } catch (error) {
    console.error("[essay/brushup] error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "ブラッシュアップ版の生成に失敗しました", detail },
      { status: 500 },
    );
  }
}
