import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildEssayReviewPrompt } from "@/lib/ai/prompts/essay";
import { EssayReviewOutputSchema } from "@/lib/ai/schemas/essay-review";
import { ESSAY_SCORE_MAX, calculateEssayTotal } from "@/lib/types/essay";
import {
  calculateEssayMetrics,
  calculateFillRate,
} from "@/lib/essay/review-metrics";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
import { sourceEngagementCaps } from "@/lib/essay/source-engagement";
import { judgeSourceEngagement } from "@/lib/essay/source-engagement-judge";
import { judgeKnowledgeAccuracy } from "@/lib/essay/knowledge-judge";
import {
  judgeSentences,
  type SentenceCheckResult,
} from "@/lib/essay/sentence-check-judge";
import {
  deriveWeaknessIssues,
  effectiveSubjectMatch,
  type DerivableFeedback,
  type DeriveOptions,
} from "@/lib/essay/derive-weakness-issues";
import {
  summarizeUsage,
  sumUsage,
  type AiCallRecord,
} from "@/lib/ai/call-record";
import type {
  EssayScoreAxis,
  EssayScores,
  EssayFeedback,
  TopicInsights,
  TaskFulfillment,
  ClaimCheck,
  ReportInsights,
  LanguageCorrection,
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
  /** 講座のブロック課題（1ブロックだけ書く）。字数不足・要求の欠落を弱点にしない */
  partial?: boolean;
  previousAttempt?: {
    essayText: string;
    feedbackSummary: string[];
  };
}

export interface EssayReviewCoreOutput {
  scores: EssayScores;
  feedback: EssayFeedback;
  rawText: string;
  /**
   * 1文ずつの点検の結果（取れなかったら null）。答案に保存する
   * （sentenceCheckFields）。保存しないと、表示・作り直し・集計で点検由来の
   * 弱点（ねじれ・助詞・誤字・矛盾）を作り直せない
   */
  sentenceCheck: SentenceCheckResult | null;
  /** 検証・費用集計用。保存はしない（使用量の合計だけ aiMetadata に載せる） */
  telemetry: EssayReviewTelemetry;
}

export interface EssayReviewTelemetry {
  /** 本体と別呼び出しの記録（呼んだものだけ） */
  calls: AiCallRecord[];
  /** 3呼び出しを並列に投げてから揃うまでの時間 */
  durationMs: number;
  /**
   * 本文に実在しない等の理由で捨てた赤ペンの件数。
   * 保存される赤ペンは実在するものだけなので、AI が本文に無い文を作った回数は
   * ここでしか数えられない。
   */
  droppedLanguageCorrections: number;
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
  const calls: AiCallRecord[] = [];
  const onCall = (record: AiCallRecord) => calls.push(record);
  const startedAt = Date.now();
  const isReport = input.questionType === "report";
  /** 口頭試問型（小問集合）。小問の数だけ指摘が増えるので report と同じ余裕を取る */
  const isOralExam = input.questionType === "oral_exam";
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
    // 自己分析（志望・価値観）は渡さない。渡すと「志望と答案がつながっていない」
    // という主観を求める指摘が出る。小論文は答案の論だけで採点する。
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

  /**
   * 課題文型のときだけ、「課題文を読んで書いたか」を別呼び出しで判定する。
   * 添削と同時に走らせるので待ち時間は増えない。判定が取れなければ減点しない。
   */
  const engagementPromise =
    input.questionType === "report" &&
    (input.sourceText?.trim().length ?? 0) > 0
      ? judgeSourceEngagement({
          client,
          essayText: input.ocrText,
          sourceText: input.sourceText as string,
          topic: input.topic,
          onCall,
        })
      : Promise.resolve(null);

  /**
   * 口頭試問型のときだけ、専門知識の正確性を別呼び出しで判定する。
   * 添削のスキーマには項目を足せない（文法サイズ上限で全添削が落ちる）。
   */
  const knowledgePromise = isOralExam
    ? judgeKnowledgeAccuracy({
        client,
        essayText: input.ocrText,
        question: input.topic ?? "",
        onCall,
      })
    : Promise.resolve(null);

  /**
   * 1文ずつの点検（主述のねじれ・助詞・意味の通らない文と、答案内の矛盾）。
   * 本体は採点と講評に手を取られて文の崩れを取りこぼす（N6 で 3回中2回）。
   */
  const sentenceCheckPromise = judgeSentences({
    client,
    essayText: input.ocrText,
    onCall,
  });

  const [response, engagement, knowledge, sentenceCheck] = await Promise.all([
    client.messages.parse({
      model: AI_MODEL_REVIEW,
      // messages.parse は max_tokens を thinking と本文で共有する。旧値の 4096 では
      // 長い構造化出力(languageCorrections 最大5件 + 各種フィードバック)に食われ、
      // 採点を吟味する余地が残らずルーブリックの既定値へ丸まっていた。
      max_tokens: isReport || isOralExam ? 16000 : 12000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      output_config: {
        format: zodOutputFormat(EssayReviewOutputSchema),
        // 既定値と同じ high だが、採点水準に直結するため明示して固定する
        effort: "high",
      },
    }),
    engagementPromise,
    knowledgePromise,
    sentenceCheckPromise,
  ]);

  const durationMs = Date.now() - startedAt;
  calls.unshift({
    name: "review",
    model: response.model,
    stopReason: response.stop_reason,
    usage: summarizeUsage(response.usage),
    ok:
      response.stop_reason !== "max_tokens" && Boolean(response.parsed_output),
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
   * 合計はAPを含まない5軸（構成・論理性・表現力・回答力・議論の成熟度）。
   * APの有無で満点が変わらなくなったので、常に50点満点で比較できる。
   */
  /**
   * 設問への適合を点に反映する（監査 P1-12）。
   *
   * 上限が構成と表現だけだと、中身の軸（論理性・回答力・成熟度）が残るため
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
  const subjectMatch = effectiveSubjectMatch(task);
  const offTopic = subjectMatch === "different";
  const narrowed = subjectMatch === "narrower";
  const capBy = (v: number, cap: number) => Math.min(v, cap);

  // 資料と食い違う主張は、資料の取り違えとして logic を抑える
  const contradicted = (parsed.feedback?.claimChecks ?? []).some(
    (c) => c.status === "contradicted"
  );

  /**
   * 課題文型で、答案が課題文に触れたか。
   *
   * 監査前は「矛盾したとき」しか減点が無く、課題文を無視した答案は無傷だった
   * （読まないほうが安全ですらあった）。触れていない答案は主題ずれと同じ重さで
   * 抑える。report 以外には一切かからない。
   */
  const sourceCaps = sourceEngagementCaps({
    questionType: input.questionType,
    level: engagement?.level ?? null,
    misreadings: parsed.feedback?.reportInsights?.misreadings ?? null,
  });

  const baseContentCap = offTopic ? 3 : narrowed || missingRequired ? 6 : 10;
  const contentCap = Math.min(baseContentCap, sourceCaps.content);
  const structureCap = contentCap;
  const maturityCap = contentCap;
  /**
   * 回答力は taskFulfillment の結論そのものなので、他の軸より強く縛る。
   * 主題がずれている・主題の一部しか論じていない（answersQuestion=false）なら
   * 3点以下、要求が欠けているなら5点以下。ルーブリックの段と一致させている。
   */
  const responsivenessCap = Math.min(
    offTopic || narrowed ? 3 : missingRequired ? 5 : 10,
    sourceCaps.content
  );
  /**
   * 1文ずつの点検の結果を点に反映する。ルーブリックの段と一致させている
   * （表現力4点 = 助詞の誤りや主述のねじれが複数ある）。本体は崩れた文を
   * 見落としたまま 7点を付けることがあった。
   */
  const grammarErrorCount = countGrammarErrors(sentenceCheck);
  const selfContradicted = (sentenceCheck?.contradictions.length ?? 0) > 0;
  const logicCap = Math.min(
    contentCap,
    contradicted ? 4 : 10,
    // 自分の主張どうしが食い違う答案は、主張と根拠が揃っている(6点)とは言えない
    selfContradicted ? 5 : 10,
    sourceCaps.logic
  );
  // 表現は「何を書いたか」に依らず読める。ずれていても6点までは認める
  const expressionCap = Math.min(
    offTopic ? 6 : 10,
    grammarErrorCount >= 2 ? 4 : 10
  );

  /**
   * 合計の満点。通常は50点。
   * 口頭試問型で知識判定が取れたときだけ、専門知識の正確性(0-10)を合計に入れて60点にする。
   * 知識を問う出題なので合計外だと「答えられていないのに点が高い」結果になる。
   * 判定が取れなければ50点満点のまま（判定不能を理由に点を下げない）。
   */
  const scoreMaximum = knowledge ? ESSAY_SCORE_MAX + 10 : ESSAY_SCORE_MAX;
  /**
   * 軸ごとの点は 0-10 のまま保存し、合計を出すときだけ配点で重み付けする。
   * 軸を 0-12 のように伸ばすとルーブリックも過去データも作り直しになるため、
   * 換算は合計の計算だけに閉じ込める。
   */
  const capped: Record<EssayScoreAxis, number> = {
    structure: capBy(parsed.scores.structure, structureCap),
    logic: capBy(parsed.scores.logic, logicCap),
    expression: capBy(parsed.scores.expression, expressionCap),
    responsiveness: capBy(parsed.scores.responsiveness, responsivenessCap),
    reasoningMaturity: capBy(parsed.scores.reasoningMaturity, maturityCap),
  };
  const total = calculateEssayTotal(capped) + (knowledge?.score ?? 0);
  const scores: EssayScores = {
    ...capped,
    apAlignment: hasAdmissionPolicy ? parsed.scores.apAlignment : null,
    ...(knowledge ? { knowledgeAccuracy: knowledge.score } : {}),
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
    })
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
        // 添削とは別呼び出しの判定（添削のスキーマに項目を足せないため）
        ...(engagement
          ? {
              engagementLevel: engagement.level,
              engagementBasis: engagement.basis,
            }
          : {}),
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

  const reviewCorrections = parsed.feedback.languageCorrections.filter(
    (correction) =>
      correction.original.length > 0 &&
      input.ocrText.includes(correction.original) &&
      correction.original !== correction.suggestion &&
      isRewrite(correction.suggestion, correction.original)
  );
  const languageCorrections = mergeSentenceCorrections(
    reviewCorrections,
    sentenceCheck
  );
  const appTargetScore = hasAdmissionPolicy ? 35 : 28;

  // Firestore は undefined を許可しないため、optional フィールドは値があるときだけ含める。
  const feedback: EssayFeedback = {
    overall: parsed.feedback.overall,
    // スキーマ側の上限は緩く取ってあるので、生徒が読める量にここで絞る。
    goodPoints: parsed.feedback.goodPoints.slice(0, 5),
    priorityImprovement: parsed.feedback.priorityImprovement,
    improvements: [
      ...contradictionImprovements(sentenceCheck),
      ...parsed.feedback.improvements,
    ].slice(0, 5),
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
    priorityTarget: detectPriorityTarget(
      parsed.feedback.priorityImprovement,
      languageCorrections
    ),
    apAlignmentAssessable: hasAdmissionPolicy,
    scoreMaximum,
    ...(knowledge
      ? {
          knowledgeInsights: {
            basis: knowledge.basis,
            errors: knowledge.errors,
          },
        }
      : {}),
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.essayReview,
      model: AI_MODEL_REVIEW,
      // 1件の費用を後から出せるように、呼び出し全部の合計を残す
      usage: sumUsage(calls),
    },
  };

  // 判定欄（文の点検・設問の充足・読み違い・知識・字数）から弱点を足す。
  // 作り直し・集計・表示と同じ関数（derive-weakness-issues.ts）
  feedback.repeatedIssues = deriveWeaknessIssues(feedback, sentenceCheck, {
    partial: input.partial,
  });

  return {
    scores,
    feedback,
    rawText,
    sentenceCheck,
    telemetry: {
      calls,
      durationMs,
      droppedLanguageCorrections:
        parsed.feedback.languageCorrections.length - reviewCorrections.length,
    },
  };
}

/**
 * 答案に保存する点検結果（essays/{id}.sentenceCheck）。
 * scripts/backfill-sentence-check.ts と同じ形（結果＋checkedAt＋source）で、
 * 読み出し側（data.sentenceCheck）はどちらも SentenceCheckResult として読む。
 * 点検が取れなかったときは何も書かない（Firestore は undefined を拒否する）
 */
export function sentenceCheckFields(
  check: SentenceCheckResult | null,
  source: "review" | "rescore"
): {
  sentenceCheck?: SentenceCheckResult & { checkedAt: string; source: string };
} {
  if (!check) return {};
  return {
    sentenceCheck: {
      brokenSentences: check.brokenSentences,
      contradictions: check.contradictions,
      checkedAt: new Date().toISOString(),
      source,
    },
  };
}

/** 赤ペンに並べる上限。本体の5件に、1文ずつの点検で見つけた崩れを足す */
const MAX_LANGUAGE_CORRECTIONS = 10;

/** 文として崩れている（表現力の減点に数える）もの。誤字は数えない */
function countGrammarErrors(check: SentenceCheckResult | null): number {
  return (check?.brokenSentences ?? []).filter((b) => b.kind !== "typo").length;
}

const SENTENCE_KIND_TYPE = {
  twist: "grammar",
  particle: "grammar",
  collocation: "grammar",
  unreadable: "grammar",
  typo: "typo",
} as const;

/**
 * 1文ずつの点検で見つけた崩れを赤ペンに合流させる。
 *
 * 崩れた文は直さないと意味が通らないので先に並べる。本体が同じ文を挙げて
 * いれば本体の方を残す（1つの文に2つの直しを並べない）。
 */
export function mergeSentenceCorrections(
  reviewCorrections: LanguageCorrection[],
  check: SentenceCheckResult | null
): LanguageCorrection[] {
  const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);
  const fromCheck: LanguageCorrection[] = (check?.brokenSentences ?? [])
    .filter(
      (b) =>
        isRewrite(b.rewrite, b.original) &&
        !reviewCorrections.some((c) => overlaps(c.original, b.original))
    )
    .map((b) => ({
      location: b.location,
      original: b.original,
      suggestion: b.rewrite,
      type: SENTENCE_KIND_TYPE[b.kind],
      reason: b.problem,
    }));
  return [...fromCheck, ...reviewCorrections].slice(
    0,
    MAX_LANGUAGE_CORRECTIONS
  );
}

function contradictionImprovements(
  check: SentenceCheckResult | null
): string[] {
  return (check?.contradictions ?? []).map(
    (c) =>
      `「${c.first}」と「${c.second}」が食い違っています。${c.explanation} どちらの立場で書くかを決め、もう一方を書き直してください。`
  );
}

/**
 * 表示時に、後から付けた1文ずつの点検と判定欄の弱点を添削結果へ合流させる。
 * 弱点DBと添削結果で弱点が食い違わないように、書き込みと同じ derive を通す。
 * 点数は採点当時のまま変えない。
 */
export function feedbackWithDerivedIssues<
  F extends DerivableFeedback & {
    languageCorrections?: LanguageCorrection[] | null;
    improvements?: string[] | null;
  },
>(
  feedback: F,
  check: SentenceCheckResult | null | undefined,
  opts: DeriveOptions = {}
): F {
  const improvements = feedback.improvements ?? [];
  const extra = check
    ? contradictionImprovements(check).filter(
        (t) => !improvements.some((i) => i.includes(t.slice(1, 20)))
      )
    : [];
  return {
    ...feedback,
    languageCorrections: check
      ? mergeSentenceCorrections(feedback.languageCorrections ?? [], check)
      : feedback.languageCorrections,
    repeatedIssues: deriveWeaknessIssues(feedback, check, opts),
    improvements: [...extra, ...improvements],
  };
}

/**
 * suggestion が「書き換えた文」になっているか。
 *
 * 赤ペンの suggestion は画面で置き換え候補として出す欄なので、解説や指示が入ると
 * 表示が壊れる。実データで「この文自体の語彙・文法は問題ありません。ただし設問の…」
 * という解説がそのまま入っていた。プロンプトでも禁じたが、保存前にも落とす。
 */
function isRewrite(suggestion: string, original: string): boolean {
  const s = suggestion.trim();
  if (s.length === 0) return false;
  // 指示・説明の言い回しが入っているものは書き換え文ではない
  if (
    /(してください|しましょう|問題ありません|ただし|以下のように|次のように)/.test(
      s
    )
  ) {
    return false;
  }
  // 元の文に対して極端に長いものは、直しではなく説明になっている
  if (s.length > original.length * 2.5 + 20) return false;
  return true;
}

/**
 * 最優先の改善点が、赤ペンと改善点のどちらを指しているかを判定する。
 *
 * モデルに宣言させるのが確実だが、採点スキーマにこれ以上フィールドを足すと
 * 構造化出力の文法が大きくなりすぎて API が 400 を返す。そのため
 * 「最優先の文が、赤ペンで挙げた文を引用しているか」で判定する。
 * プロンプト側で、赤ペンを指すときは「」で引用するよう指示している。
 */
export function detectPriorityTarget(
  priorityImprovement: string,
  corrections: { original: string }[]
): "improvement" | "language" {
  const quotes = priorityImprovement.match(/「([^」]{6,})」/g) ?? [];
  for (const raw of quotes) {
    const quote = raw.slice(1, -1);
    if (corrections.some((c) => c.original.includes(quote))) return "language";
  }
  return "improvement";
}
