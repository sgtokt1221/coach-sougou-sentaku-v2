import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireRole } from "@/lib/api/auth";
import { buildAppearanceCheckPrompt } from "@/lib/ai/prompts/appearance";
import { AppearanceCheckOutputSchema } from "@/lib/ai/schemas/appearance-check";
import type { AppearanceAnalysis } from "@/lib/types/interview";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";

/** 画像1枚の解析。Vision は数秒かかるので既定の実行時間では足りない */
export const maxDuration = 60;

/** 受け取る画像の上限（base64 文字列長）。約4MBの画像相当 */
const MAX_IMAGE_BASE64_LENGTH = 6_000_000;

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export async function POST(request: NextRequest) {
  // 画像を投げる有料API。誰でも叩ける状態にしない
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { imageBase64, mimeType = "image/jpeg" } = await request.json();

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 }
    );
  }
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json({ error: "画像が大きすぎます" }, { status: 413 });
  }
  const mediaType = (ALLOWED_MIME as readonly string[]).includes(mimeType)
    ? (mimeType as (typeof ALLOWED_MIME)[number])
    : "image/jpeg";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "身だしなみチェックにはAPI設定が必要です", available: false },
      { status: 503 }
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: AI_MODEL_SONNET,
      // 指摘が数件出ると512では本文が途中で切れる。切れた分は検証で全部捨てられる
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: buildAppearanceCheckPrompt() },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(AppearanceCheckOutputSchema),
      },
    });

    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      console.error("[appearance-check] 構造化応答が不正", {
        stop_reason: response.stop_reason,
        usage: response.usage,
      });
      return NextResponse.json(
        { error: "身だしなみの判定結果を読み取れませんでした" },
        { status: 502 }
      );
    }

    const analysis: AppearanceAnalysis = response.parsed_output;
    return NextResponse.json(analysis);
  } catch (err) {
    // 失敗の中身をサーバーログに残す（画面には理由が出ないため）
    console.error("[appearance-check] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "外見分析に失敗しました" },
      { status: 500 }
    );
  }
}
