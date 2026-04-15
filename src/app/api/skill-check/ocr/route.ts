import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";

/**
 * スキルチェック用の軽量 OCR エンドポイント。
 * 画像 base64 を受け取り、Google Vision + Claude Haiku 本文抽出を経て
 * ocrText を返す。Firestore やStorage には触らない。
 *
 * Note: essay/upload と OCR ロジックは同一だが、依存関係を増やさないため
 * ここに閉じた実装にしている。将来的に共通化する場合は
 * src/lib/ocr/ 以下に切り出す想定。
 */

export const maxDuration = 60;

function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-vision",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  const signature = sign.sign(privateKey, "base64url");
  return `${signInput}.${signature}`;
}

async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const jwt = createJwt(clientEmail, privateKey);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function ocrWithGoogleVision(base64Data: string): Promise<string | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;
    const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["ja"] },
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.responses?.[0]?.fullTextAnnotation?.text ?? null;
  } catch {
    return null;
  }
}

async function extractEssayBody(rawOcrText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return rawOcrText;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `あなたはOCRテキストから小論文の本文だけを抽出するフィルターです。
入力されたテキストから、手書きの小論文本文のみを抽出し、それだけを出力してください。
絶対に自分の言葉を追加しないでください。説明、前置き、コメント、注釈は一切不要です。
抽出した本文テキストだけを出力してください。それ以外は何も出力しないでください。`,
      messages: [
        {
          role: "user",
          content: `以下のOCRテキストから小論文の本文のみを抽出してください。

【除外するもの】
- 印刷済みの文字（「小論文」「受験番号」「氏名」「注意事項」「問題」「以下の〜」等の定型文）
- 用紙のヘッダー・フッター・欄外テキスト
- ページ番号、行番号
- 問題文・設問文

本文テキストだけを出力。他は何も書かないで。

---
${rawOcrText}`,
        },
      ],
    });
    const result = response.content[0].type === "text" ? response.content[0].text : null;
    return result?.trim() || rawOcrText;
  } catch {
    return rawOcrText;
  }
}

async function ocrWithClaude(base64Data: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
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
              text: `この画像は原稿用紙に手書きされた小論文です。一字一句、原文に忠実に書き起こしてください。読めない文字は「■」で表示。テキスト以外の説明は一切不要。本文のみを出力。`,
            },
          ],
        },
      ],
    });
    return response.content[0].type === "text" ? response.content[0].text : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body as { imageBase64?: string };
    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 は必須です" }, { status: 400 });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // 1. Google Vision → Claude 本文抽出
    const rawGcv = await ocrWithGoogleVision(base64Data);
    let ocrText: string | null = rawGcv ? await extractEssayBody(rawGcv) : null;

    // 2. フォールバック: Claude Vision
    if (!ocrText) {
      ocrText = await ocrWithClaude(base64Data);
    }

    if (!ocrText) {
      return NextResponse.json(
        { error: "画像からテキストを読み取れませんでした" },
        { status: 422 },
      );
    }
    return NextResponse.json({ ocrText });
  } catch (err) {
    console.error("skill-check ocr error:", err);
    return NextResponse.json(
      { error: "OCR処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
