import Anthropic from "@anthropic-ai/sdk";
import type { TemplateInfo } from "@/lib/types/ocr";

/** 検出プロンプトのバージョン（変更時に更新して記録に残す） */
export const DETECT_PROMPT_VERSION = "detect-v1";

const FALLBACK: TemplateInfo = {
  kind: "plain",
  orientation: "unknown",
  rows: null,
  cols: null,
  corners: null,
  skewAngle: null,
  detectFailed: true,
};

/**
 * 画像から用紙種別・向き・四隅・傾きを1回のClaude呼び出しで推定する。
 * 失敗時は plain/detectFailed=true を返し、呼び出し側は安全経路へ縮退する。
 * @param base64Data 前処理前の画像base64
 * @returns TemplateInfo
 */
export async function detectTemplate(base64Data: string): Promise<TemplateInfo> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK;
  if (process.env.ESSAY_TEMPLATE_OCR_ENABLED === "false") return FALLBACK;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
            {
              type: "text",
              text: `この画像の答案用紙を分析し、次のJSONのみを出力してください（前後に文章を付けない）。
{
  "kind": "genko" | "plain",            // 四隅にL字マーカーがあるマス目原稿用紙なら genko、それ以外は plain
  "orientation": "vertical" | "horizontal" | "unknown",  // 文字の書字方向
  "rows": 数値 | null,                   // マス目の行数（genkoのみ, 例:20）
  "cols": 数値 | null,                   // マス目の列数（genkoのみ, 例:20）
  "corners": [[x,y],[x,y],[x,y],[x,y]] | null,  // 本文グリッドの四隅[左上,右上,右下,左下]のピクセル座標。genkoで明確な時のみ
  "skewAngle": 数値 | null               // 用紙の傾き角(度, 時計回り正)。plainで推定できる時のみ
}`,
            },
          ],
        },
      ],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return FALLBACK;
    const parsed = JSON.parse(match[0]);
    const kind = parsed.kind === "genko" ? "genko" : "plain";
    const corners = Array.isArray(parsed.corners) && parsed.corners.length === 4
      ? (parsed.corners as [number, number][])
      : null;
    return {
      kind,
      orientation: ["vertical", "horizontal"].includes(parsed.orientation) ? parsed.orientation : "unknown",
      rows: typeof parsed.rows === "number" ? parsed.rows : null,
      cols: typeof parsed.cols === "number" ? parsed.cols : null,
      corners,
      skewAngle: typeof parsed.skewAngle === "number" ? parsed.skewAngle : null,
      detectFailed: false,
    };
  } catch (err) {
    console.warn("[detect] failed:", err);
    return FALLBACK;
  }
}
