import Anthropic from "@anthropic-ai/sdk";
import type { EssayScores, EssayFeedback, TopicInsights } from "@/lib/types/essay";

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
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error(`AI添削結果のパースに失敗: ${rawText.slice(0, 300)}`);
  }

  const parsed = JSON.parse(jsonMatch[1]);

  const scores: EssayScores = {
    structure: parsed.scores.structure,
    logic: parsed.scores.logic,
    expression: parsed.scores.expression,
    apAlignment: parsed.scores.apAlignment,
    originality: parsed.scores.originality,
    total: parsed.scores.total,
  };

  const topicInsights: TopicInsights | undefined = parsed.feedback.topicInsights
    ? {
        background: parsed.feedback.topicInsights.background ?? "",
        relatedThemes: parsed.feedback.topicInsights.relatedThemes ?? [],
        deepDivePoints: parsed.feedback.topicInsights.deepDivePoints ?? [],
        recommendedAngle: parsed.feedback.topicInsights.recommendedAngle ?? "",
      }
    : undefined;

  const feedback: EssayFeedback = {
    overall: parsed.feedback.overall ?? "",
    goodPoints: parsed.feedback.goodPoints ?? [],
    improvements: parsed.feedback.improvements ?? [],
    repeatedIssues: parsed.feedback.repeatedIssues ?? [],
    improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
    topicInsights,
    brushedUpText: parsed.feedback.brushedUpText ?? undefined,
    languageCorrections: parsed.feedback.languageCorrections ?? [],
    priorityImprovement: parsed.feedback.priorityImprovement ?? undefined,
    nextChallenge: parsed.feedback.nextChallenge ?? undefined,
    quantitativeAnalysis: parsed.feedback.quantitativeAnalysis ?? undefined,
  };

  return { scores, feedback, raw: rawText };
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
