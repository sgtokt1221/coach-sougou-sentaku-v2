import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

async function ocrWithClaude(base64Data: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Data },
          },
          {
            type: "text",
            text: `この画像は原稿用紙に手書きされた小論文です。以下のルールに厳密に従って書き起こしてください。

【最重要ルール】
- 一字一句、原文に忠実に書き起こすこと。絶対に要約・省略・言い換えをしないこと
- 読めない文字は「■」で表示すること
- 誤字・脱字があっても原文のまま書き起こすこと（勝手に修正しない）
- 文法的におかしくても原文通りに書くこと
- 段落の改行は原文に従うこと
- 句読点（、。）の位置も原文通りにすること

テキスト以外の説明は一切不要です。書き起こした本文のみを出力してください。`,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, universityId, facultyId } = body;

    if (!imageBase64 || !universityId || !facultyId) {
      return NextResponse.json(
        { error: "imageBase64, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const essayId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const imageUrl = `gs://placeholder/${essayId}.jpg`;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ocrText = await ocrWithClaude(base64Data);

    if (!ocrText) {
      return NextResponse.json(
        { error: "画像からテキストを読み取れませんでした" },
        { status: 422 }
      );
    }

    console.log(`[Essay OCR] Claude Vision: ${ocrText.length} chars`);

    return NextResponse.json({
      essayId,
      ocrText,
      imageUrl,
      ocrWords: [],
      pageWidth: 0,
      pageHeight: 0,
    });
  } catch (error) {
    console.error("Essay upload error:", error);
    return NextResponse.json(
      { error: "アップロード処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
