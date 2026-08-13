import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { InterviewScoreOutputSchema } from "@/lib/ai/schemas/interview-score";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
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
  /**
   * 前回の面接結果（同一モード）。渡さないと前回比は出せない。
   * 以前は渡さないまま improvementsSinceLast を要求しており、
   * モデルが比較内容を作文できる状態だった（監査 P1-2）。
   */
  previousAttempt?: {
    scores: { clarity: number; apAlignment: number; enthusiasm: number; specificity: number };
    feedbackSummary: string[];
  };
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

  /**
   * 前回結果の有無で指示を切り替える（監査 P1-2）。
   * 無いのに前回比を求めると、モデルは比較を作文してしまう。
   */
  const previousSection = input.previousAttempt
    ? `\n\n## 前回の面接結果（同一モード）\n` +
      `スコア: 明確さ${input.previousAttempt.scores.clarity} / AP合致度${input.previousAttempt.scores.apAlignment} / ` +
      `熱意${input.previousAttempt.scores.enthusiasm} / 具体性${input.previousAttempt.scores.specificity}\n` +
      `前回の講評:\n${input.previousAttempt.feedbackSummary.map((x) => `- ${x}`).join("\n")}\n\n` +
      `※ improvementsSinceLast には、前回と今回の両方で確認できる差だけを書いてください。`
    : `\n\n## 前回の面接結果\n前回の記録はありません。improvementsSinceLast は必ず空配列にしてください。推測で比較を書かないこと。`;

  const selfAnalysisSection = input.selfAnalysisContext
    ? `\n\n## この生徒の自己分析データ(面接前に本人が整理した内容)\n${input.selfAnalysisContext}\n\n※ 上記の自己分析を踏まえて、「面接でこう答えるべきだった」「自己分析のこの強みをもっと活かすべきだった」等の具体的なアドバイスを improvements に含めてください。`
    : "";

  /**
   * 構造化出力で受ける（監査 P1-1）。
   * 以前は本文から JSON を正規表現で抜き出して JSON.parse していたため、
   * 範囲外の点数も、軸の欠落も、型違いも素通りしていた。
   */
  const response = await client.messages.parse({
    model: AI_MODEL_REVIEW,
    // parse() は max_tokens を thinking と本文で共有する。4096 では
    // 評価を吟味する余地が残らない（小論文で実際に起きた）
    max_tokens: 12000,
    messages: [
      {
        role: "user",
        content: `${evaluationPrompt}${selfAnalysisSection}\n\n## 面接会話記録\n\n${conversationText}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(InterviewScoreOutputSchema),
      effort: "high",
    },
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  if (response.stop_reason === "max_tokens") {
    throw new InterviewScoreParseError(
      "AI 評価結果が最大トークン数で途中終了しました",
      rawText,
    );
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new InterviewScoreParseError(
      "AI 評価結果が構造化出力スキーマを満たしませんでした",
      rawText,
    );
  }

  /**
   * 伝達（動画）は内容と満点も評価可否も違うので、合計に混ぜない。
   * 動画が無い回は 0 ではなく null（評価不能）。0 にすると「最低評価」と
   * 区別が付かず、平均やランクを歪めていた（監査 P0-1）。
   */
  const rawVideoScore = input.videoAnalysis?.overallVideoScore;
  const bodyLanguage =
    typeof rawVideoScore === "number"
      ? Math.round(rawVideoScore * 10) / 10
      : null;
  /**
   * モード別の追加軸。プロンプトは集団討論の協調性・口頭試問の専門知識などを
   * 要求しているのに、保存時に捨てていた（監査 P0-2）。AI を呼んで採点させた
   * 結果を使わず、どのモードも実質同じ4軸で見ている状態だった。
   *
   * 合計には入れない。モードごとに軸数が変わると満点が変わり、
   * 面接どうしの比較ができなくなる（P0-1 と同じ失敗を繰り返さない）。
   */
  const MODE_KEYS = [
    "presentationStructure",
    "dataEvidence",
    "resourceConsistency",
    "knowledgeAccuracy",
    "criticalThinking",
    "collaboration",
    "leadership",
    "listening",
  ] as const;
  const modeScores: Partial<Record<(typeof MODE_KEYS)[number], number>> = {};
  for (const key of MODE_KEYS) {
    const v = parsed.scores?.[key];
    // 0-10 の数値だけ受ける。範囲外・欠落は無かったものとして扱う
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10) {
      modeScores[key] = Math.round(v * 10) / 10;
    }
  }

  const scores: InterviewScores = {
    clarity: parsed.scores.clarity,
    apAlignment: parsed.scores.apAlignment,
    enthusiasm: parsed.scores.enthusiasm,
    specificity: parsed.scores.specificity,
    bodyLanguage,
    ...modeScores,
    // 内容4軸のみ。満点は常に INTERVIEW_CONTENT_MAX (40)
    total:
      parsed.scores.clarity +
      parsed.scores.apAlignment +
      parsed.scores.enthusiasm +
      parsed.scores.specificity,
  };

  const feedback: InterviewFeedback = {
    overall: parsed.feedback.overall,
    goodPoints: parsed.feedback.goodPoints ?? [],
    improvements: parsed.feedback.improvements ?? [],
    repeatedIssues: parsed.feedback.repeatedIssues ?? [],
    // 前回結果を渡していないのに比較が返ってきたら捨てる。作文を保存しない
    improvementsSinceLast: input.previousAttempt
      ? (parsed.feedback.improvementsSinceLast ?? [])
      : [],
    personalizedAdvice: parsed.feedback.personalizedAdvice ?? [],
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.interviewScore,
      model: AI_MODEL_REVIEW,
    },
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
