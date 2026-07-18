import Anthropic from "@anthropic-ai/sdk";
import { buildAiLikenessPrompt } from "@/lib/ai/prompts/ai-likeness";
import { aiLikenessLevel } from "@/lib/types/document";
import type { DocumentAiLikeness } from "@/lib/types/document";

/** AIっぽさ判定に必要な書類コンテキスト。 */
export interface AiLikenessContext {
  documentType: string;
  universityName: string;
  facultyName: string;
}

/**
 * Claude で本文の「AIっぽさ」を判定し {@link DocumentAiLikeness} を返す。
 * 認可・永続化・APIキー未設定チェックは呼び出し側の責務（この関数は判定のみ）。
 * 生徒用 API と管理者用 API の両方から呼ばれる共通ロジック。
 * @param content 判定対象の本文
 * @param ctx 書類タイプ・大学名・学部名
 * @throws レスポンスがパースできない、またはスコアが数値として取得できない場合
 */
export async function checkAiLikeness(
  content: string,
  ctx: AiLikenessContext
): Promise<DocumentAiLikeness> {
  const client = new Anthropic();
  const systemPrompt = buildAiLikenessPrompt(
    ctx.documentType,
    ctx.universityName,
    ctx.facultyName
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    console.error("Could not parse AI likeness response:", rawText);
    throw new Error("AIレスポンスの解析に失敗しました");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const rawScore = Number(parsed.score);
  if (!Number.isFinite(rawScore)) {
    console.error("AI likeness score missing/invalid:", rawText);
    throw new Error("AIっぽさの判定結果を取得できませんでした");
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  return {
    score,
    level: aiLikenessLevel(score),
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 8).map(String) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8).map(String) : [],
    checkedAt: new Date().toISOString(),
    checkedWordCount: content.length,
  };
}
