import Anthropic from "@anthropic-ai/sdk";
import type { OcrEngine, OcrEngineResult, OcrCell } from "@/lib/types/ocr";
import { flattenCells } from "@/lib/ocr/text";

export const CLAUDE_GRID_PROMPT_VERSION = "grid-v1";

/** 原稿用紙をマス構造(row/col/char/uncertain)で読み取るエンジン */
export const claudeGridEngine: OcrEngine = {
  id: "claude-grid",
  model: "claude-sonnet-4-6",
  promptVersion: CLAUDE_GRID_PROMPT_VERSION,
  async run({ base64, template }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const client = new Anthropic();
      const rows = template.rows ?? 20;
      const cols = template.cols ?? 20;
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `${rows}行×${cols}列の原稿用紙（向き:${template.orientation}）です。マスごとに読み取り、次のJSONのみ出力してください。
{"cells":[{"row":0,"col":0,"char":"私","uncertain":false,"alternatives":[]}, ...]}
規則:
- 1マス=1文字。空白マスは char="" として座標付きで含める
- 判読不能は推測せず char="■"
- 文字を訂正・言い換えしない（原文に忠実）
- 訂正線で消された文字は含めない。マス外・欄外・印刷文字は無視
- 自信がないマスは uncertain=true、代替候補があれば alternatives に入れる
- JSON以外の文章は一切出力しない`,
              },
            ],
          },
        ],
      });
      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      const match = raw.match(/\{[\s\S]*\}/);
      const truncated = response.stop_reason === "max_tokens";
      if (!match) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: truncated ? "truncated" : "no-json" };
      const parsed = JSON.parse(match[0]);
      const cells = (parsed.cells ?? []) as OcrCell[];
      const text = flattenCells(cells, template.orientation);
      return { text, cells, confidence: null, latencyMs: Date.now() - start, costUsd: 0.03, error: truncated ? "truncated" : undefined };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
