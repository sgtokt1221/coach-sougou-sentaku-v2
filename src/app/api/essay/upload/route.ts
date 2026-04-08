import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";

// ---- Google Cloud Vision API OCR ----

function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

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

  if (!res.ok) {
    console.warn("[GCV] Token request failed:", res.status);
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

async function ocrWithGoogleVision(base64Data: string): Promise<string | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[GCV] No access token available");
      return null;
    }

    const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Data },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ja"] },
        }],
      }),
    });

    if (!res.ok) {
      console.warn("[GCV] API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text;
    if (text) {
      console.log(`[GCV] Success: ${text.length} chars`);
      return text;
    }

    console.warn("[GCV] No text detected");
    return null;
  } catch (err) {
    console.warn("[GCV] Exception:", err);
    return null;
  }
}

// ---- Claude: OCR結果から本文のみ抽出 ----

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
  } catch (err) {
    console.warn("[Extract] Failed, using raw OCR:", err);
    return rawOcrText;
  }
}

// ---- Claude Vision OCR (fallback) ----

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

【読み取り範囲】
- 原稿用紙のマス目内に手書きされた本文のみを読み取ること
- 用紙に印刷されたタイトル欄、注意書き、受験番号、学校名、氏名欄、問題文、設問文は全て無視すること
- マス目の外にある印刷文字は全て無視すること

【書き起こしルール】
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

// ---- Main handler ----

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
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Cloud Storageに画像をアップロード
    let imageUrl = "";
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const bucket = getStorage().bucket();
      const file = bucket.file(`essays/${essayId}.jpg`);
      const imageBuffer = Buffer.from(base64Data, "base64");
      await file.save(imageBuffer, { contentType: "image/jpeg" });
      const [url] = await file.getSignedUrl({ action: "read", expires: "2030-01-01" });
      imageUrl = url;
    } catch (storageErr) {
      console.warn("[Storage] Upload failed, using fallback:", storageErr);
      imageUrl = `gs://essays/${essayId}.jpg`;
    }

    let ocrText: string | null = null;
    let ocrSource = "";

    // 1. Google Cloud Vision (高精度・低コスト) → Claude Haikuで本文抽出
    const rawGcvText = await ocrWithGoogleVision(base64Data);
    if (rawGcvText) {
      ocrText = await extractEssayBody(rawGcvText);
      ocrSource = "google-vision+haiku";
    }

    // 2. Claude Vision フォールバック（プロンプトで本文のみ指示済み）
    if (!ocrText) {
      ocrText = await ocrWithClaude(base64Data);
      ocrSource = "claude";
    }

    if (!ocrText) {
      return NextResponse.json(
        { error: "画像からテキストを読み取れませんでした" },
        { status: 422 }
      );
    }

    console.log(`[Essay OCR] Source: ${ocrSource}, Length: ${ocrText.length} chars`);

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
