import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireRole } from "@/lib/api/auth";
import { requireFeature } from "@/lib/api/subscription";
import { buildSelfWriteJudgePrompt } from "@/lib/ai/prompts/document-selfwrite";
import { SelfWriteJudgeSchema } from "@/lib/ai/schemas/document-selfwrite";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import type { SelfWriteRequest } from "@/lib/types/document-selfwrite";

export const maxDuration = 60;

/**
 * POST /api/documents/self-write
 *
 * 本人が書いた文を判定する。示した要素が入っているか、示した指摘が
 * 解消したかだけを見る。書き直した文をこちらから返すことはしない
 * （返せば結局それが本文に入るため）。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;

  const gate = await requireFeature(request, "documentEditor");
  if (gate) return gate;

  const body = (await request
    .json()
    .catch(() => null)) as SelfWriteRequest | null;
  if (
    !body ||
    (body.mode !== "elements" && body.mode !== "fixes") ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    typeof body.studentText !== "string" ||
    !body.studentText.trim()
  ) {
    return NextResponse.json(
      { error: "mode, items, studentText は必須です" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 設定が未完了です" }, { status: 503 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: AI_MODEL_SONNET,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: buildSelfWriteJudgePrompt({
            ...body,
            items: body.items.slice(0, 8),
          }),
        },
      ],
      output_config: {
        format: zodOutputFormat(SelfWriteJudgeSchema),
        effort: "low",
      },
    });

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "判定が途中で終了しました。もう一度お試しください" },
        { status: 500 }
      );
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "判定結果を読み取れませんでした" },
        { status: 500 }
      );
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[documents/self-write] failed:", error);
    return NextResponse.json({ error: "判定に失敗しました" }, { status: 500 });
  }
}
