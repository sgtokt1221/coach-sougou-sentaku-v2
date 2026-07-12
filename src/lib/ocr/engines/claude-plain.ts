import Anthropic from "@anthropic-ai/sdk";
import type { OcrEngine, OcrEngineResult } from "@/lib/types/ocr";

export const CLAUDE_PLAIN_PROMPT_VERSION = "plain-v1";

/** 普通紙/フォールバック用の平文本文起こしエンジン */
export const claudePlainEngine: OcrEngine = {
  id: "claude-plain",
  model: "claude-sonnet-4-6",
  promptVersion: CLAUDE_PLAIN_PROMPT_VERSION,
  async run({ base64 }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `この画像は日本語の手書き小論文です。手書き本文のみを左上から右下に書き起こしてください。
- 欄外・印刷文字（タイトル欄・氏名欄・受験番号・問題文・注意書き）は一切無視
- 一字一句、原文に忠実。要約・省略・言い換えは絶対にしない
- 読めない文字は ■。誤字脱字はそのまま。改行は原文の段落に従う
テキスト以外の説明は不要。本文のみを出力。`,
              },
            ],
          },
        ],
      });
      const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      return { text, confidence: null, latencyMs: Date.now() - start, costUsd: 0.02 };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
