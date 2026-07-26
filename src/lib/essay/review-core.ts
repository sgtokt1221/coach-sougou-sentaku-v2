import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  buildEssayReviewPrompt,
  type EssaySelfAnalysisContext,
} from "@/lib/ai/prompts/essay";
import { EssayReviewOutputSchema } from "@/lib/ai/schemas/essay-review";
import { calculateEssayMetrics } from "@/lib/essay/review-metrics";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
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
 * - Anthropic structured outputs と Zod で応答を検証する
 * - 合計点・文字数等の決定的な値をサーバー側で計算する
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
  admissionPolicy?: string;
  weaknessList: string;
  essaySelfAnalysis?: EssaySelfAnalysisContext;
  previousAttempt?: {
    essayText: string;
    feedbackSummary: string[];
  };
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
    public readonly repairError?: string
  ) {
    super(message);
    this.name = "EssayReviewParseError";
  }
}

export async function reviewEssayCore(
  input: EssayReviewCoreInput
): Promise<EssayReviewCoreOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic();
  const isReport = input.questionType === "report";
  const admissionPolicy = input.admissionPolicy?.trim() ?? "";
  const hasAdmissionPolicy = admissionPolicy.length > 0;
  const systemPrompt = buildEssayReviewPrompt({
    questionType: input.questionType,
    hasAdmissionPolicy,
    hasPreviousAttempt: Boolean(input.previousAttempt),
    hasWordLimit: Boolean(input.wordLimit),
  });

  const referenceData = {
    topic: input.topic ?? null,
    questionType: input.questionType ?? "essay",
    wordLimit: input.wordLimit ?? null,
    admissionPolicy: hasAdmissionPolicy ? admissionPolicy : null,
    priorWeaknesses: input.weaknessList || null,
    selfAnalysis: input.essaySelfAnalysis ?? null,
    sourceText: input.sourceText ?? null,
    chartDataSummary: input.chartDataSummary ?? null,
    lectureInfo: input.lectureInfo ?? null,
  };
  const previousAttempt = input.previousAttempt ?? null;
  const userMessage = `<reference_data>
${JSON.stringify(referenceData)}
</reference_data>
<previous_attempt>
${JSON.stringify(previousAttempt)}
</previous_attempt>
<essay_under_review>
${input.ocrText}
</essay_under_review>`;

  const response = await client.messages.parse({
    model: AI_MODEL_REVIEW,
    max_tokens: isReport ? 6000 : 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(EssayReviewOutputSchema),
    },
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  if (response.stop_reason === "max_tokens") {
    throw new EssayReviewParseError(
      "AI 添削結果が最大トークン数で途中終了しました",
      rawText
    );
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new EssayReviewParseError(
      "AI 添削結果が構造化出力スキーマを満たしませんでした",
      rawText
    );
  }

  const scoreMaximum = hasAdmissionPolicy ? 50 : 40;
  const total =
    parsed.scores.structure +
    parsed.scores.logic +
    parsed.scores.expression +
    parsed.scores.originality +
    (hasAdmissionPolicy ? parsed.scores.apAlignment : 0);
  const scores: EssayScores = {
    structure: parsed.scores.structure,
    logic: parsed.scores.logic,
    expression: parsed.scores.expression,
    apAlignment: hasAdmissionPolicy ? parsed.scores.apAlignment : 0,
    originality: parsed.scores.originality,
    total,
  };

  const topicInsights: TopicInsights | undefined = parsed.feedback
    ?.topicInsights
    ? {
        background: parsed.feedback.topicInsights.background ?? "",
        relatedThemes: parsed.feedback.topicInsights.relatedThemes ?? [],
        deepDivePoints: parsed.feedback.topicInsights.deepDivePoints ?? [],
        recommendedAngle: parsed.feedback.topicInsights.recommendedAngle ?? "",
      }
    : undefined;

  const reportInsights: ReportInsights | undefined = parsed.feedback
    .reportInsights
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

  const languageCorrections = parsed.feedback.languageCorrections.filter(
    (correction) =>
      correction.original.length > 0 &&
      input.ocrText.includes(correction.original) &&
      correction.original !== correction.suggestion
  );
  const appTargetScore = hasAdmissionPolicy ? 35 : 28;

  // Firestore は undefined を許可しないため、optional フィールドは値があるときだけ含める。
  const feedback: EssayFeedback = {
    overall: parsed.feedback.overall,
    goodPoints: parsed.feedback.goodPoints,
    priorityImprovement: parsed.feedback.priorityImprovement,
    improvements: parsed.feedback.improvements,
    nextChallenge: parsed.feedback.nextChallenge,
    repeatedIssues: parsed.feedback.repeatedIssues.filter(
      (issue) => hasAdmissionPolicy || issue.category !== "apAlignment"
    ),
    improvementsSinceLast: input.previousAttempt
      ? parsed.feedback.improvementsSinceLast
      : [],
    ...(topicInsights ? { topicInsights } : {}),
    ...(reportInsights ? { reportInsights } : {}),
    languageCorrections,
    quantitativeAnalysis: calculateEssayMetrics(
      input.ocrText,
      input.wordLimit,
      total,
      appTargetScore
    ),
    apAlignmentAssessable: hasAdmissionPolicy,
    scoreMaximum,
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.essayReview,
      model: AI_MODEL_REVIEW,
    },
  };

  return { scores, feedback, rawText };
}
