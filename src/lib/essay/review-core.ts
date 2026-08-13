import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  buildEssayReviewPrompt,
  type EssaySelfAnalysisContext,
} from "@/lib/ai/prompts/essay";
import { EssayReviewOutputSchema } from "@/lib/ai/schemas/essay-review";
import { ESSAY_SCORE_MAX } from "@/lib/types/essay";
import {
  calculateEssayMetrics,
  calculateFillRate,
} from "@/lib/essay/review-metrics";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
import type {
  EssayScores,
  EssayFeedback,
  TopicInsights,
  TaskFulfillment,
  ClaimCheck,
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
  // 充足率はプロンプトにも渡す。モデルに字数を数えさせると server 側の集計と
  // ずれ、「7割未満なら減点」の判定が安定しない。
  const fillRate = calculateFillRate(input.ocrText, input.wordLimit);
  const systemPrompt = buildEssayReviewPrompt({
    questionType: input.questionType,
    hasAdmissionPolicy,
    hasPreviousAttempt: Boolean(input.previousAttempt),
    wordLimit: input.wordLimit,
    fillRate,
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
    // messages.parse は max_tokens を thinking と本文で共有する。旧値の 4096 では
    // 長い構造化出力(languageCorrections 最大5件 + 各種フィードバック)に食われ、
    // 採点を吟味する余地が残らずルーブリックの既定値へ丸まっていた。
    max_tokens: isReport ? 16000 : 12000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(EssayReviewOutputSchema),
      // 既定値と同じ high だが、採点水準に直結するため明示して固定する
      effort: "high",
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

  /**
   * 合計はAPを含まない5軸（構成・論理性・表現力・独自性・議論の成熟度）。
   * APの有無で満点が変わらなくなったので、常に50点満点で比較できる。
   */
  /**
   * 設問への適合を点に反映する（監査 P1-12）。
   *
   * 上限が構成と表現だけだと、中身の軸（論理性・独自性・成熟度）が残るため
   * 主題を外した答案でも22〜28点の中位に居座った。設問に答えていない以上、
   * その論・具体・考察は「別の問いへの答え」なので、内容側をまとめて抑える。
   *
   *   ずれている（answersQuestion=false）: 内容4軸を3点以下、表現は6点以下
   *     → 上限18点/50（36%）。文章力は事実として観測できるので表現は残す
   *   要求の欠落（答えてはいるが一部欠け）: 設問対応に関わる3軸を6点以下
   *     → 上限は概ね30点台前半
   */
  const task = parsed.feedback?.taskFulfillment;
  const missingRequired =
    task?.requirements?.some((r) => r.status === "missing") ?? false;
  /**
   * 上限は subjectMatch（3択）で決める。ブール1つだと実行ごとに揺れ、
   * 同じ答案が 17点 と 25点 の間で動いた。
   *   different = 別の話題が中心 → 内容4軸 3点以下
   *   narrower  = 主題の一部に限定 → 6点以下
   *   same      = 要求の欠落があれば6点以下、無ければ上限なし
   */
  const subjectMatch = task?.subjectMatch ?? (task?.answersQuestion === false ? "different" : "same");
  const offTopic = subjectMatch === "different";
  const narrowed = subjectMatch === "narrower";
  const capBy = (v: number, cap: number) => Math.min(v, cap);

  // 資料と食い違う主張は、資料の取り違えとして logic を抑える
  const contradicted = (parsed.feedback?.claimChecks ?? []).some(
    (c) => c.status === "contradicted",
  );

  const contentCap = offTopic ? 3 : narrowed || missingRequired ? 6 : 10;
  const structureCap = contentCap;
  const originalityCap = contentCap;
  const maturityCap = contentCap;
  const logicCap = Math.min(contentCap, contradicted ? 4 : 10);
  // 表現は「何を書いたか」に依らず読める。ずれていても6点までは認める
  const expressionCap = offTopic ? 6 : 10;

  const scoreMaximum = ESSAY_SCORE_MAX;
  const total =
    capBy(parsed.scores.structure, structureCap) +
    capBy(parsed.scores.logic, logicCap) +
    capBy(parsed.scores.expression, expressionCap) +
    capBy(parsed.scores.originality, originalityCap) +
    capBy(parsed.scores.reasoningMaturity, maturityCap);
  const scores: EssayScores = {
    structure: capBy(parsed.scores.structure, structureCap),
    logic: capBy(parsed.scores.logic, logicCap),
    expression: capBy(parsed.scores.expression, expressionCap),
    originality: capBy(parsed.scores.originality, originalityCap),
    reasoningMaturity: capBy(parsed.scores.reasoningMaturity, maturityCap),
    apAlignment: hasAdmissionPolicy ? parsed.scores.apAlignment : null,
    total,
  };

  /**
   * 事実主張の確認状態（監査 P1-11）。資料と食い違う主張があれば、
   * 資料の取り違えと同じ扱いで logic を抑える（プロンプト任せにしない）。
   */
  const claimChecks: ClaimCheck[] = (parsed.feedback?.claimChecks ?? []).map(
    (c) => ({
      claim: c.claim,
      type: c.type,
      status: c.status,
      evidence: c.evidence ?? "",
    }),
  );

  const taskFulfillment: TaskFulfillment | undefined = task
    ? {
        answersQuestion: task.answersQuestion,
        subjectMatch: task.subjectMatch,
        requirements: (task.requirements ?? []).map((r) => ({
          requirement: r.requirement,
          status: r.status,
          evidence: r.evidence ?? "",
        })),
        note: task.note ?? "",
      }
    : undefined;

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
    // スキーマ側の上限は緩く取ってあるので、生徒が読める量にここで絞る。
    goodPoints: parsed.feedback.goodPoints.slice(0, 5),
    priorityImprovement: parsed.feedback.priorityImprovement,
    improvements: parsed.feedback.improvements.slice(0, 5),
    nextChallenge: parsed.feedback.nextChallenge,
    repeatedIssues: parsed.feedback.repeatedIssues.filter(
      (issue) => hasAdmissionPolicy || issue.category !== "apAlignment"
    ),
    improvementsSinceLast: input.previousAttempt
      ? parsed.feedback.improvementsSinceLast
      : [],
    ...(topicInsights ? { topicInsights } : {}),
    ...(taskFulfillment ? { taskFulfillment } : {}),
    ...(claimChecks.length > 0 ? { claimChecks } : {}),
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
