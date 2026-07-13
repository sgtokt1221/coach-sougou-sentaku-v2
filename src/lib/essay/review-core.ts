import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import {
  buildEssayReviewPrompt,
  type EssaySelfAnalysisContext,
} from "@/lib/ai/prompts/essay";
import type {
  EssayScores,
  EssayFeedback,
  TopicInsights,
  ReportInsights,
} from "@/lib/types/essay";

/**
 * 小論文添削 AI 呼び出しのコア機能。
 *
 * 役割:
 * - Anthropic API を叩いてスコアとフィードバックを得る
 * - JSON のパース (jsonrepair フォールバック付き) を行う
 *
 * 役割外 (呼び出し側で扱うこと):
 * - Firestore I/O (essay ドキュメントの作成・更新、弱点 DB の更新)
 * - BigQuery ログ
 * - 認証・認可
 *
 * これにより `/api/essay/review` と宿題提出フロー (`POST /api/student/homework/[id]/submit`)
 * の双方が同じ AI 添削ロジックを共有できる。
 */

export interface EssayReviewCoreInput {
  ocrText: string;
  topic?: string;
  questionType?: string;
  sourceText?: string;
  chartDataSummary?: string;
  lectureInfo?: string | null;
  wordLimit?: number;
  admissionPolicy: string;
  weaknessList: string;
  essaySelfAnalysis?: EssaySelfAnalysisContext;
}

export interface EssayReviewCoreOutput {
  scores: EssayScores;
  feedback: EssayFeedback;
  rawText: string;
}

export class EssayReviewParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
    public readonly parseError?: string,
    public readonly repairError?: string,
  ) {
    super(message);
    this.name = "EssayReviewParseError";
  }
}

export async function reviewEssayCore(
  input: EssayReviewCoreInput,
): Promise<EssayReviewCoreOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic();
  const isReport = input.questionType === "report";
  const questionContext =
    input.questionType && input.questionType !== "essay" && !isReport
      ? {
          questionType: input.questionType as
            | "english-reading"
            | "data-analysis"
            | "mixed"
            | "lecture",
          sourceText: input.sourceText,
          chartDataSummary: input.chartDataSummary,
          lectureInfo: input.lectureInfo ?? undefined,
        }
      : undefined;

  const systemPrompt = buildEssayReviewPrompt(
    input.admissionPolicy,
    input.weaknessList,
    input.essaySelfAnalysis,
    questionContext,
    input.wordLimit,
  );

  let userMessage = "";
  if (input.topic) userMessage += `【テーマ】${input.topic}\n\n`;
  if (input.sourceText) {
    const label = isReport ? "【課題文】" : "【出題資料(英文)】";
    userMessage += `${label}\n${input.sourceText}\n\n`;
  }
  if (input.chartDataSummary) userMessage += `【資料データ】\n${input.chartDataSummary}\n\n`;
  userMessage += `【小論文本文】\n${input.ocrText}`;

  if (isReport) {
    userMessage +=
      "\n\nこれは上記【課題文】を読んで書く『レポート』です。5観点スコアと通常の feedback に加えて、" +
      "JSON の feedback に必ず \"reportInsights\" を含めてください。reportInsights は次のキーを持つオブジェクトです: " +
      "sourceComprehension(課題文の理解度・要点把握), summaryAccuracy(要約・言い換えの正確さ), " +
      "citationAppropriateness(引用/参照の妥当さ), analysisDepth(自分の考察の深さ・独自性), " +
      "sourceConnection(課題文と自論の接続), misreadings(課題文の誤読・事実誤認を指摘する文字列配列)。" +
      "各文字列は具体的な講評にしてください。";
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: isReport ? 6000 : 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new EssayReviewParseError(
      "AI 添削結果に JSON ブロックが含まれていません",
      rawText,
    );
  }

  let parsed: ReturnType<typeof JSON.parse>;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch (parseErr) {
    try {
      parsed = JSON.parse(jsonrepair(jsonMatch[1]));
    } catch (repairErr) {
      throw new EssayReviewParseError(
        "AI 添削結果のパースに失敗しました (jsonrepair も失敗)",
        rawText,
        (parseErr as Error).message,
        (repairErr as Error).message,
      );
    }
  }

  const scores: EssayScores = {
    structure: parsed.scores.structure,
    logic: parsed.scores.logic,
    expression: parsed.scores.expression,
    apAlignment: parsed.scores.apAlignment,
    originality: parsed.scores.originality,
    total: parsed.scores.total,
  };

  const topicInsights: TopicInsights | undefined = parsed.feedback?.topicInsights
    ? {
        background: parsed.feedback.topicInsights.background ?? "",
        relatedThemes: parsed.feedback.topicInsights.relatedThemes ?? [],
        deepDivePoints: parsed.feedback.topicInsights.deepDivePoints ?? [],
        recommendedAngle: parsed.feedback.topicInsights.recommendedAngle ?? "",
      }
    : undefined;

  const reportInsights: ReportInsights | undefined = parsed.feedback
    ?.reportInsights
    ? {
        sourceComprehension:
          parsed.feedback.reportInsights.sourceComprehension ?? "",
        summaryAccuracy: parsed.feedback.reportInsights.summaryAccuracy ?? "",
        citationAppropriateness:
          parsed.feedback.reportInsights.citationAppropriateness ?? "",
        analysisDepth: parsed.feedback.reportInsights.analysisDepth ?? "",
        sourceConnection: parsed.feedback.reportInsights.sourceConnection ?? "",
        misreadings: parsed.feedback.reportInsights.misreadings ?? [],
      }
    : undefined;

  // Firestore は undefined を許可しないため、optional フィールドは
  // 値があるときだけ key を含める (条件付き spread)。
  const feedback: EssayFeedback = {
    overall: parsed.feedback.overall,
    goodPoints: parsed.feedback.goodPoints ?? [],
    improvements: parsed.feedback.improvements ?? [],
    repeatedIssues: parsed.feedback.repeatedIssues ?? [],
    improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
    ...(topicInsights ? { topicInsights } : {}),
    ...(reportInsights ? { reportInsights } : {}),
    ...(parsed.feedback.brushedUpText
      ? { brushedUpText: parsed.feedback.brushedUpText }
      : {}),
    languageCorrections: parsed.feedback.languageCorrections ?? [],
  };

  return { scores, feedback, rawText };
}
