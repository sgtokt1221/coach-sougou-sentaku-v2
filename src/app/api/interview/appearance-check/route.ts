import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildAppearanceCheckPrompt } from "@/lib/ai/prompts/appearance";
import type { AppearanceAnalysis } from "@/lib/types/interview";

export async function POST(request: Request) {
  const { imageBase64, mimeType = "image/jpeg" } = await request.json();

  if (!imageBase64) {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "身だしなみチェックにはAPI設定が必要です", available: false },
      { status: 503 }
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: buildAppearanceCheckPrompt(),
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse appearance analysis" },
        { status: 500 }
      );
    }

    const analysis: AppearanceAnalysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "外見分析に失敗しました" },
      { status: 500 }
    );
  }
}
