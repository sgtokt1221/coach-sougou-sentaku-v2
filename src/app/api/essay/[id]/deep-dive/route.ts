import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { buildEssayDeepDivePrompt } from "@/lib/ai/prompts/essay-deep-dive";
import { EssayDeepDiveOutputSchema } from "@/lib/ai/schemas/essay-deep-dive";
import type { EssayDeepDive } from "@/lib/types/essay";

export const maxDuration = 120;

/**
 * POST /api/essay/[id]/deep-dive
 *
 * テーマの深掘りをオンデマンド生成する。既に生成済みなら再生成せず既存値を返す
 * （毎回の提出では作らない。読む人だけが1回だけ払う）。
 *
 * 採点（reviewEssayCore）と分けているのは、採点プロンプトが
 * 「入力から確認できる背景だけを述べる」という縛りを持っているため。
 * 事実の捏造を防ぐ規則として採点には要るが、背景知識を教える目的とは両立しない。
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

    // 本人以外には返さない（答案は個人のもの）
    if (data.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この答案へのアクセス権がありません" },
        { status: 403 }
      );
    }

    // 生成済みならそのまま返す
    if (data.deepDive) {
      return NextResponse.json(data.deepDive as EssayDeepDive);
    }

    const essayText = (data.ocrText ?? "").trim();
    if (!essayText) {
      return NextResponse.json(
        { error: "答案本文がありません" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY が設定されていません" },
        { status: 503 }
      );
    }

    const prompt = buildEssayDeepDivePrompt({
      topic: data.topic ?? data.questionContext?.title ?? "",
      sourceText:
        data.questionContext?.sourceText ??
        data.retryContext?.sourceText ??
        null,
      essayText,
      facultyName: data.targetFaculty ?? null,
    });

    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      // 読み物として長さが要る。messages.parse は max_tokens を thinking と
      // 本文で共有するので、短くすると本文が痩せる（CLAUDE.md）。
      // これ以上大きくすると SDK がストリーミングを要求して失敗するため、
      // 本添削（review-core）と同じ上限に合わせている。
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: zodOutputFormat(EssayDeepDiveOutputSchema),
        // 事実の正確さが読み物の価値そのものなので、ここは削らない
        effort: "high",
      },
    });

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "生成が途中で終了しました。もう一度お試しください" },
        { status: 500 }
      );
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "生成結果を読み取れませんでした" },
        { status: 500 }
      );
    }

    const deepDive: EssayDeepDive = {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };

    await essayRef.set({ deepDive }, { merge: true });

    return NextResponse.json(deepDive);
  } catch (err) {
    console.error("[essay/deep-dive] failed:", err);
    return NextResponse.json(
      { error: "深掘りの生成に失敗しました" },
      { status: 500 }
    );
  }
}
