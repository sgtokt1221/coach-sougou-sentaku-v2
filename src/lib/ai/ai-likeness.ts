import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { buildAiLikenessPrompt } from "@/lib/ai/prompts/ai-likeness";
import { aiLikenessLevel } from "@/lib/types/document";
import type { DocumentAiLikeness } from "@/lib/types/document";
import { AI_MODEL_SONNET, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";

/** 個別性・テンプレ表現チェックに必要な書類コンテキスト。 */
export interface AiLikenessContext {
  documentType: string;
  universityName: string;
  facultyName: string;
}

const AiLikenessOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string().max(1000)).min(1).max(5),
  suggestions: z.array(z.string().max(1000)).min(1).max(5),
});

/**
 * Claude で本文の個別性・テンプレ表現を確認し {@link DocumentAiLikeness} を返す。
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

  const response = await client.messages.parse({
    model: AI_MODEL_SONNET,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `<document_under_check>\n${content}\n</document_under_check>`,
      },
    ],
    output_config: {
      format: zodOutputFormat(AiLikenessOutputSchema),
    },
  });

  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("AIレスポンスの解析に失敗しました");
  }

  const parsed = response.parsed_output;
  const score = parsed.score;
  return {
    score,
    level: aiLikenessLevel(score),
    reasons: parsed.reasons,
    suggestions: parsed.suggestions,
    checkedAt: new Date().toISOString(),
    checkedWordCount: content.length,
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.individualityCheck,
      model: AI_MODEL_SONNET,
    },
  };
}
