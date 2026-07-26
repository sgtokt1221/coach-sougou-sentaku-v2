import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SkillCheckOutputSchema } from "@/lib/ai/schemas/skill-check";
import { AI_MODEL_REVIEW } from "@/lib/ai/prompt-versions";
import type { EssayScores, EssayFeedback } from "@/lib/types/essay";

export interface ReviewCoreResult {
  scores: EssayScores;
  feedback: EssayFeedback;
  raw: string;
}

/**
 * Claude APIを呼び、EssayScores + EssayFeedback を抽出する共通ロジック。
 * /api/essay/review と /api/skill-check/submit の両方で使用される。
 *
 * 呼び出し側は system/user プロンプトを自由に差し替えられる。
 */
export async function reviewWithClaude(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<ReviewCoreResult> {
  const { systemPrompt, userMessage, maxTokens = 4096 } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEYが設定されていません");
  }

  const client = new Anthropic();

  // 構造化出力 + Zod 検証で受け取る。以前はテキスト応答から正規表現でJSONを
  // 切り出して JSON.parse していたため、モデルが引用符やエスケープを1文字誤ると
  // 採点全体が失敗していた（本番で "Unterminated string in JSON" 系の失敗が発生）。
  const response = await client.messages.parse({
    model: AI_MODEL_REVIEW,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(SkillCheckOutputSchema),
      // 拡張思考に max_tokens を食われて本文が切れるのを防ぐ
      effort: "low",
    },
  });

  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    console.error("[reviewWithClaude] 構造化応答が不正", {
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
    throw new Error("AI添削結果の検証に失敗しました");
  }

  const parsed = response.parsed_output;

  // 合計はモデルに計算させず、サーバー側で確定させる
  const total =
    parsed.scores.structure +
    parsed.scores.logic +
    parsed.scores.expression +
    parsed.scores.apAlignment +
    parsed.scores.originality;

  const scores: EssayScores = { ...parsed.scores, total };

  const feedback: EssayFeedback = {
    overall: parsed.feedback.overall,
    goodPoints: parsed.feedback.goodPoints,
    improvements: parsed.feedback.improvements,
    priorityImprovement: parsed.feedback.priorityImprovement,
    nextChallenge: parsed.feedback.nextChallenge,
    // スキルチェックでは使わない項目（小論文添削側で扱う）
    repeatedIssues: [],
    improvementsSinceLast: [],
    languageCorrections: [],
  };

  return { scores, feedback, raw: JSON.stringify(parsed) };
}

/**
 * モック結果（dev fallback用）。Firebase未設定時でもUIが動くように固定値を返す。
 */
export function buildMockReviewResult(essayText: string): ReviewCoreResult {
  const wordCount = essayText.length;
  const baseScore = Math.min(10, Math.max(4, Math.floor(wordCount / 100)));
  const scores: EssayScores = {
    structure: baseScore,
    logic: baseScore,
    expression: Math.max(4, baseScore - 1),
    apAlignment: Math.max(4, baseScore - 1),
    originality: Math.max(4, baseScore - 2),
    total: baseScore * 5 - 4,
  };
  const feedback: EssayFeedback = {
    overall: "（モック）全体的に筋の通った論述ができています。",
    goodPoints: ["論旨が明確", "具体例が豊富"],
    improvements: ["結論部の強化", "反対意見への言及"],
    repeatedIssues: [],
    improvementsSinceLast: [],
    priorityImprovement: "反対意見への言及を1段落加える",
  };
  return { scores, feedback, raw: "mock" };
}
