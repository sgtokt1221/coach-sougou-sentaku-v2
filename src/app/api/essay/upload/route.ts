import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MOCK_OCR_TEXT = `現代社会において、テクノロジーの急速な発展は私たちの生活を大きく変えています。
特に人工知能の台頭は、教育・医療・産業など多くの分野に革命をもたらしています。
私はこのような変化の中で、人間としての創造性と倫理観を保ちながら、テクノロジーと共存する社会の構築に貢献したいと考えています。
（以下、モックOCRテキストです）`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, universityId, facultyId, topic } = body;

    if (!imageBase64 || !universityId || !facultyId) {
      return NextResponse.json(
        { error: "imageBase64, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const essayId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const imageUrl = `gs://placeholder/${essayId}.jpg`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        essayId,
        ocrText: MOCK_OCR_TEXT,
        imageUrl,
      });
    }

    const client = new Anthropic();

    // base64文字列からdata URL部分を除去
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "この画像に書かれた小論文のテキストを正確に読み取り、そのまま出力してください。段落構成や改行も維持してください。テキスト以外の説明は不要です。",
            },
          ],
        },
      ],
    });

    const ocrText =
      response.content[0].type === "text"
        ? response.content[0].text
        : MOCK_OCR_TEXT;

    return NextResponse.json({
      essayId,
      ocrText,
      imageUrl,
    });
  } catch (error) {
    console.error("Essay upload error:", error);
    return NextResponse.json(
      { error: "アップロード処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
