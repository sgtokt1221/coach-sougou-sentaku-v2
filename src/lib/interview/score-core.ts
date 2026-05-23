import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewEvaluationPrompt } from "@/lib/ai/prompts/interview";
import type {
  InterviewScores,
  InterviewFeedback,
  InterviewMessage,
  VideoAnalysis,
} from "@/lib/types/interview";

/**
 * 面接スコアリング AI 呼び出しのコア機能。
 *
 * 役割:
 * - 会話ログを評価プロンプトで Anthropic API に投げる
 * - JSON パースしてスコア・フィードバック・会話分析サマリーを返す
 * - VideoAnalysis があれば bodyLanguage スコアを合算
 *
 * 役割外 (呼び出し側で扱うこと):
 * - Firestore I/O (interviews ドキュメント更新、弱点 DB 更新)
 * - BigQuery ログ
 * - 認証・認可
 * - 弱点タグの集計 (画像分析からの追加タグなど)
 *
 * これにより `/api/interview/end` と宿題提出フロー双方が同じスコアリングを共有できる。
 */

export interface InterviewScoreCoreInput {
  messages: InterviewMessage[];
  universityName: string;
  facultyName: string;
  admissionPolicy: string;
  /** "personal" | "group" | "presentation" | "viva" など。空でも可 */
  mode?: string;
  /** プレゼンモード時の発表内容 */
  presentationContent?: string;
  /** 自己分析の整形済みコンテキスト (改行区切りテキスト) */
  selfAnalysisContext?: string;
  /** 動画分析。あれば bodyLanguage スコアの加算に使う */
  videoAnalysis?: VideoAnalysis;
}

export interface InterviewScoreCoreOutput {
  scores: InterviewScores;
  feedback: InterviewFeedback;
  conversationSummary: {
    keyWeaknesses: string[];
    strongPoints: string[];
    criticalMoments: string[];
    nextFocusAreas: string[];
  };
  rawText: string;
}

export class InterviewScoreParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
  ) {
    super(message);
    this.name = "InterviewScoreParseError";
  }
}

export async function scoreInterviewCore(
  input: InterviewScoreCoreInput,
): Promise<InterviewScoreCoreOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic();

  // 会話をテキスト形式に変換
  const conversationText = input.messages
    .map((m) => `${m.role === "ai" ? "面接官" : "受験生"}: ${m.content}`)
    .join("\n");

  const evaluationPrompt = buildInterviewEvaluationPrompt(
    input.universityName,
    input.facultyName,
    input.admissionPolicy,
    input.mode,
    input.presentationContent,
  );

  const selfAnalysisSection = input.selfAnalysisContext
    ? `\n\n## この生徒の自己分析データ(面接前に本人が整理した内容)\n${input.selfAnalysisContext}\n\n※ 上記の自己分析を踏まえて、「面接でこう答えるべきだった」「自己分析のこの強みをもっと活かすべきだった」等の具体的なアドバイスを improvements に含めてください。`
    : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${evaluationPrompt}${selfAnalysisSection}\n\n## 面接会話記録\n\n${conversationText}`,
      },
    ],
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new InterviewScoreParseError(
      "AI 評価結果に JSON ブロックが含まれていません",
      rawText,
    );
  }

  let parsed: ReturnType<typeof JSON.parse>;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch (err) {
    throw new InterviewScoreParseError(
      `JSON.parse 失敗: ${(err as Error).message}`,
      rawText,
    );
  }

  const bodyLanguageScore = input.videoAnalysis?.overallVideoScore ?? 0;
  const bodyLanguageRounded = Math.round(bodyLanguageScore * 10) / 10;
  const scores: InterviewScores = {
    clarity: parsed.scores.clarity,
    apAlignment: parsed.scores.apAlignment,
    enthusiasm: parsed.scores.enthusiasm,
    specificity: parsed.scores.specificity,
    bodyLanguage: bodyLanguageRounded,
    total:
      parsed.scores.clarity +
      parsed.scores.apAlignment +
      parsed.scores.enthusiasm +
      parsed.scores.specificity +
      bodyLanguageRounded,
  };

  const feedback: InterviewFeedback = {
    overall: parsed.feedback.overall,
    goodPoints: parsed.feedback.goodPoints ?? [],
    improvements: parsed.feedback.improvements ?? [],
    repeatedIssues: parsed.feedback.repeatedIssues ?? [],
    improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
  };

  const conversationSummary = parsed.conversationSummary ?? {
    keyWeaknesses: [],
    strongPoints: [],
    criticalMoments: [],
    nextFocusAreas: [],
  };

  // VideoAnalysis / AppearanceAnalysis から弱点タグを引き出すロジックは
  // 呼び出し側に委ねる (UI 表現に依存するため)。

  return { scores, feedback, conversationSummary, rawText };
}
