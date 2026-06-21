import Anthropic from "@anthropic-ai/sdk";
import {
  TRANSCRIPT_CORRECT_SYSTEM_PROMPT,
  buildTurnCorrectPrompt,
} from "@/lib/ai/prompts/transcript-correct";
import { recordAiTrace } from "@/lib/ai/trace";

/**
 * 音声面接の文字起こし1発言を Claude(Haiku) で誤変換補正するコア関数。
 *
 * 役割:
 * - フィラー除去済みの生徒発言テキストを、会話文脈と固有名詞を手がかりに補正する。
 * - 同音異義語・誤変換・助詞ミス・文の区切りのみを直す（意味・内容は変えない）。
 *
 * 役割外（呼び出し側で扱う）:
 * - 認証/認可、Firestore I/O、UI 反映。
 *
 * 設計原則: **面接フローを絶対に止めない**。API キー未設定・例外・空応答・極端に短い相槌
 * などはすべて原文をそのまま返す。コストは recordAiTrace で fire-and-forget 記録する。
 */

const MODEL = "claude-haiku-4-5-20251001";

export interface CorrectTranscriptCtx {
  /** 直近の会話の流れ（面接官・受験生のやり取り）。話題を踏まえた補正に使う。 */
  conversationContext?: string;
  universityName?: string;
  facultyName?: string;
  studentName?: string;
  highSchoolName?: string;
  /** コスト集計用（任意）。 */
  uid?: string | null;
}

/**
 * 1発言を補正して返す。失敗時・補正不要時は入力テキストをそのまま返す。
 */
export async function correctTranscriptTurn(
  utterance: string,
  ctx: CorrectTranscriptCtx = {},
): Promise<string> {
  const text = (utterance ?? "").trim();
  // 空・極端に短い相槌（「はい」「ええ」等）は誤変換余地が小さく、無駄打ちを避ける
  if (text.length < 4) return utterance;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return utterance;

  const startedAt = Date.now();
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: TRANSCRIPT_CORRECT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildTurnCorrectPrompt(text, ctx) }],
    });

    const out =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    void recordAiTrace({
      feature: "interview-transcript-correct",
      model: MODEL,
      startedAt,
      usage: response.usage,
      uid: ctx.uid ?? null,
      ok: true,
    });

    // 空応答や明らかに長すぎる（説明文を返した等）場合は原文を採用
    if (!out || out.length > text.length * 3 + 50) return utterance;
    return out;
  } catch (err) {
    void recordAiTrace({
      feature: "interview-transcript-correct",
      model: MODEL,
      startedAt,
      uid: ctx.uid ?? null,
      ok: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return utterance;
  }
}
