import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ---- Azure Document Intelligence OCR ----
interface AzureOcrResult {
  text: string;
  words: Array<{ text: string; polygon: number[]; confidence: number }>;
  pageWidth: number;
  pageHeight: number;
}

async function ocrWithAzure(base64Data: string): Promise<AzureOcrResult | null> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  if (!endpoint || !key) return null;

  try {
    // 1. Submit analysis
    const analyzeUrl = `${endpoint}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
    const submitRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Source: base64Data }),
    });

    if (!submitRes.ok) {
      console.warn("[Azure OCR] Submit failed:", submitRes.status, await submitRes.text());
      return null;
    }

    // 2. Get operation location for polling
    const operationLocation = submitRes.headers.get("Operation-Location");
    if (!operationLocation) {
      console.warn("[Azure OCR] No Operation-Location header");
      return null;
    }

    // 3. Poll for result (max 30 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        const result = pollData.analyzeResult;
        const content = result?.content;
        if (content) {
          // Extract words with polygon positions
          const words: Array<{ text: string; polygon: number[]; confidence: number }> = [];
          const page = result.pages?.[0];
          if (page) {
            for (const line of page.lines ?? []) {
              for (const word of line.words ?? []) {
                words.push({
                  text: word.content ?? "",
                  polygon: word.polygon ?? [],
                  confidence: word.confidence ?? 0,
                });
              }
            }
          }
          console.log(`[Azure OCR] Success: ${content.length} chars, ${words.length} words`);
          return {
            text: content,
            words,
            pageWidth: page?.width ?? 0,
            pageHeight: page?.height ?? 0,
          };
        }
        return null;
      }
      if (pollData.status === "failed") {
        console.warn("[Azure OCR] Analysis failed:", pollData.error);
        return null;
      }
      // "running" → continue polling
    }
    console.warn("[Azure OCR] Timeout after 30s");
    return null;
  } catch (err) {
    console.warn("[Azure OCR] Exception:", err);
    return null;
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

// ---- Main handler ----
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, universityId, facultyId, writingDirection } = body;
    const direction: "vertical" | "horizontal" = writingDirection === "horizontal" ? "horizontal" : "vertical";

    if (!imageBase64 || !universityId || !facultyId) {
      return NextResponse.json(
        { error: "imageBase64, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const essayId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const imageUrl = `gs://placeholder/${essayId}.jpg`;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // 1. Try Azure Document Intelligence (higher accuracy for handwriting)
    const azureResult = await ocrWithAzure(base64Data);
    let ocrText = azureResult?.text ?? null;
    let ocrSource = azureResult ? "azure" : "";
    const ocrWords = azureResult?.words ?? [];
    const pageWidth = azureResult?.pageWidth ?? 0;
    const pageHeight = azureResult?.pageHeight ?? 0;

    // 2. Fallback to Claude Vision
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

    // 3. Claude restoration step — fix OCR errors and restore reading order
    let restoredText = ocrText;
    let restorationNotes = "";
    let corrections: Array<{ original: string; corrected: string; reason: string }> = [];

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && ocrSource === "azure") {
      try {
        const { buildOcrRestorationPrompt } = await import("@/lib/ai/prompts/essay");
        const client = new Anthropic();
        const restorationPrompt = buildOcrRestorationPrompt(direction);

        const restoreRes = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: restorationPrompt + ocrText,
          }],
        });

        const rawRestore = restoreRes.content[0].type === "text" ? restoreRes.content[0].text : "";
        const jsonMatch = rawRestore.match(/```json\s*([\s\S]*?)\s*```/) || rawRestore.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          restoredText = parsed.restoredText ?? ocrText;
          restorationNotes = parsed.restorationNotes ?? "";
          corrections = parsed.corrections ?? [];
          console.log(`[Essay OCR] Restored: ${restoredText.length} chars, ${corrections.length} corrections`);
        }
      } catch (err) {
        console.warn("[Essay OCR] Restoration failed, using raw OCR:", err);
      }
    }

    return NextResponse.json({
      essayId,
      ocrText: restoredText,
      rawOcrText: ocrText,
      imageUrl,
      ocrWords,
      pageWidth,
      pageHeight,
      _debug: { ocrSource, restorationNotes, corrections },
    });
  } catch (error) {
    console.error("Essay upload error:", error);
    return NextResponse.json(
      { error: "アップロード処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
