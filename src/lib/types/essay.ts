import type { AiGenerationMetadata } from "@/lib/types/ai";
import type { LinkedCoachThread } from "./essay-coach";

export type EssayStatus =
  | "uploaded"
  | "ocr_confirmed"
  | "reviewing"
  | "reviewed";

export const ESSAY_STATUS_LABELS: Record<string, string> = {
  uploaded: "OCR待ち",
  ocr_confirmed: "OCR確認済",
  reviewing: "添削中",
  reviewed: "添削完了",
};

export interface Essay {
  id: string;
  userId: string;
  imageUrl: string;
  ocrText: string;
  targetUniversity: string;
  targetFaculty: string;
  topic?: string;
  submittedAt: Date;
  scores?: EssayScores;
  feedback?: EssayFeedback;
  status: EssayStatus;
  rootEssayId?: string;
  parentEssayId?: string | null;
  attemptNumber?: number;
  inputMode?: "image" | "text" | "dictation";
  retryContext?: EssayRetryContext;
  /** Phase 6: 出典 (manual=通常提出, homework=宿題提出, skill_check=スキルチェック, lecture=小論文講座, report=レポート課題) */
  sourceType?: "manual" | "homework" | "skill_check" | "lecture" | "report";
  /** Phase 6: 宿題から提出された場合の HomeworkAssignment ID */
  homeworkAssignmentId?: string;
  /** 小論文講座の関連問題から提出された場合の講義 ID (sourceType="lecture") */
  lectureId?: string;
  /** 管理者/講師による範囲指定インラインコメント */
  inlineComments?: EssayInlineComment[];
  /** 出題の文脈（出題形式・制限字数・課題文）。管理者の答案詳細で表示する */
  questionContext?: EssayQuestionContextData;
  /** topic を下書きから時刻で推定して復元したか */
  topicEstimated?: boolean;
  /** 執筆中に使った AIコーチ会話のID（提出時に保存。推定不要の確実な紐付け） */
  coachThreadId?: string;
  /** この答案を書いていたときの AIコーチ会話（管理者の答案詳細で表示する） */
  coachThreads?: LinkedCoachThread[];
  /** テーマの深掘り。開いたときに生成して保存する（毎回の提出では作らない） */
  deepDive?: EssayDeepDive;
}

/**
 * 小論文本文の特定範囲に対する、管理者/講師の手動コメント。
 * range は ocrText の文字オフセット。quote は当時の選択テキスト(表示/フォールバック用)。
 */
export interface EssayInlineComment {
  id: string;
  /** ocrText 中の開始/終了 文字オフセット */
  start: number;
  end: number;
  /** 選択時の本文スナップショット */
  quote: string;
  /** コメント本文 */
  comment: string;
  createdBy: string;
  createdByName: string;
  createdByRole: "admin" | "teacher" | "superadmin";
  /** ISO8601 */
  createdAt: string;
  /** 生徒が読んだか */
  read: boolean;
}

export interface EssayRetryContext {
  wordLimit?: number | null;
  questionType?: EssayReviewRequest["questionType"] | null;
  sourceText?: string | null;
  chartDataSummary?: string | null;
  pastQuestionFacultyName?: string | null;
  lectureInfo?: string | null;
}

/** 合計に入る軸の満点。AP は合計外なので含まない */
export const ESSAY_SCORE_MAX = 50;

/**
 * 合計50点の中での軸ごとの配点。
 *
 * 各軸は従来どおり 0-10 で採点し、合計を出すときだけこの配点へ換算する。
 * ルーブリックもレーダーチャートも 0-10 のままなので、改定前の答案と
 * 軸ごとの比較ができる。
 *
 * v13 までは5軸とも10点（各20%）。v14 で独自性の比重を下げた。
 * v23（2026-09-18）で独自性の軸そのものをやめ、**回答力**（設問が求めた
 * ことに答えているか）に置き換えた。総合型選抜の答案で最初に見られるのは
 * 「問われたことに答えているか」であり、着眼点の新しさではないため。
 * 配点は 回答力10・成熟度5 とし、合計50点は維持する。
 */
export const ESSAY_SCORE_WEIGHTS = {
  structure: 12,
  logic: 12,
  expression: 11,
  responsiveness: 10,
  reasoningMaturity: 5,
} as const;

export type EssayScoreAxis = keyof typeof ESSAY_SCORE_WEIGHTS;

/**
 * 軸ごとの 0-10 から合計（0-50）を出す。
 *
 * 小論文添削（review-core）とスキルチェック（essay-reviewer）の双方がここを通す。
 * 換算式を2箇所に書くと、片方だけ配点を変えたときに同じ0-50スケールで
 * 合成している集計（skill-check/aggregate）が黙って壊れる。
 */
export function calculateEssayTotal(
  scores: Partial<Record<EssayScoreAxis, number>>
): number {
  const axes = Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[];
  return Math.round(
    axes.reduce(
      (sum, axis) =>
        sum + (scores[axis] ?? 0) * (ESSAY_SCORE_WEIGHTS[axis] / 10),
      0
    )
  );
}

/**
 * 小論文のスコア。
 *
 * total は 構成・論理性・表現力・回答力・議論の成熟度 の5軸（各0-10）を
 * ESSAY_SCORE_WEIGHTS で重み付けした 0-50。
 * AP合致度は合計に入れない。以前は全設問で合計の20%を占め、資料読解や
 * 設問対応より重くなっていた（監査 P1-6）。APは志望校との相性を見る
 * 補助指標として別に持つ。
 */
export interface EssayScores {
  structure: number; // 構成 0-10
  logic: number; // 論理性 0-10
  expression: number; // 表現力 0-10
  /** 回答力 0-10（設問が求めたことに答えているか）。v23 で独自性を置き換えた */
  responsiveness: number;
  /**
   * 独自性 0-10。v23（2026-09-18）で廃止した旧軸。
   * 過去の答案を開いたときに「独自性（旧軸）」として表示するためだけに残す。
   * 新規採点では書き込まない（合計にも入らない）。
   */
  originality?: number;
  /** 議論の成熟度 0-10。旧データには無いので任意 */
  reasoningMaturity?: number;
  /** AP合致度 0-10。合計外の補助指標。AP未取得なら null */
  apAlignment: number | null;
  /**
   * 専門知識の正確性 0-10。**口頭試問型（questionType="oral_exam"）だけ**付き、
   * その回だけ合計に入る（満点60）。知識を問う出題なので、合計外だと
   * 「答えられていないのに点が高い」結果になる。
   * 判定できなかった回は付かず、合計は50点満点のまま。
   */
  knowledgeAccuracy?: number;
  /** 合計。通常は 0-50、口頭試問型で知識判定が取れた回は 0-60 */
  total: number;
}

/**
 * 満点の違う答案を横並びにするための、50点スケールへの換算。
 *
 * 口頭試問型は専門知識の正確性を合計に入れるので満点60。素の total のまま
 * 平均・推移・アラートに混ぜると、口頭試問型を1本やっただけで平均が上がり、
 * 「伸びた」ように見える（エラーは出ない）。
 *
 * **比較・集計に使う値はここを通す。** 1件の答案をそのまま見せる場所
 * （添削結果・答案詳細）では換算せず、実際の点と満点を出す。
 */
export function normalizedEssayTotal(
  total: number,
  scoreMaximum?: number | null
): number {
  if (typeof scoreMaximum !== "number" || scoreMaximum <= 0) return total;
  if (scoreMaximum === ESSAY_SCORE_MAX) return total;
  return Math.round((total / scoreMaximum) * ESSAY_SCORE_MAX * 10) / 10;
}

/** 小論文スコアの軸ラベル（グラフ・履歴・管理画面の正本） */
export const ESSAY_AXIS_LABELS: Record<EssayScoreAxis, string> = {
  structure: "構成",
  logic: "論理性",
  expression: "表現力",
  responsiveness: "回答力",
  reasoningMaturity: "議論の成熟度",
};

/** 廃止した軸のラベル。過去データを表示するときだけ使う */
export const LEGACY_ESSAY_AXIS_LABELS: Record<string, string> = {
  originality: "独自性（旧軸）",
};

/** 設問が求めた要求ごとの充足判定（監査 P1-12） */
export interface TaskFulfillment {
  /** 設問に正面から答えているか */
  answersQuestion: boolean;
  /** 答案の中心的な話題と設問の主題の関係 */
  subjectMatch?: "same" | "narrower" | "different";
  /** 設問の主題語 */
  subject?: string;
  requirements: {
    requirement: string;
    status: "met" | "partial" | "missing";
    /** met/partial の根拠となる答案内の一文 */
    evidence: string;
  }[];
  /** 外している場合に、何を書くべきだったか */
  note: string;
}

/** 答案が持ち出した事実主張の確認状態（監査 P1-11） */
export interface ClaimCheck {
  claim: string;
  type:
    | "person"
    | "organization"
    | "law_or_policy"
    | "research_or_book"
    | "statistic"
    | "date"
    | "quotation"
    | "personal_fact";
  status: "verified" | "contradicted" | "unverified" | "not_checkable";
  evidence: string;
}

/**
 * テーマの深掘り。採点とは別に、開いたときだけ生成する読み物。
 *
 * 採点の中で作っていた topicInsights は「入力から確認できる背景だけを述べる」
 * 制約の下にあり（採点で事実を捏造させないためのルール）、背景知識を補うという
 * 本来の目的を果たせなかった。知識を教えるのが目的の生成は、採点と分ける。
 */
export interface EssayDeepDive {
  /** この設問が扱っている論点を一文で */
  issue: string;
  /** 何と何が対立しているのか。ここが読み物の本体 */
  conflict: string;
  /** 主な立場。それぞれの言い分と、弱いところ */
  positions: {
    label: string;
    claim: string;
    grounds: string;
    weakness: string;
  }[];
  /** 知っていると書ける具体（制度・出来事・数値）。断定できないものは書かせない */
  facts: { title: string; detail: string }[];
  /** よくある誤解と、なぜ誤解なのか */
  misconceptions: { belief: string; correction: string }[];
  /** この設問で実際に使える切り口 */
  angles: { angle: string; howToUse: string }[];
  /** さらに調べるための問い */
  furtherQuestions: string[];
  aiMetadata?: AiGenerationMetadata;
  /** ISO 8601 */
  generatedAt: string;
}

export interface TopicInsights {
  background: string;
  relatedThemes: string[];
  deepDivePoints: string[];
  recommendedAngle: string;
}

/**
 * 出題形式の正本。採点ルーブリック・コーチの観点・データ側の分類はすべてこれを参照する。
 *
 * - essay: 設問のみ（資料なし）
 * - english-reading: 英文を読んで答える
 * - data-analysis: グラフ・統計を読んで答える
 * - mixed: 英文＋データ
 * - lecture: 講義・動画を踏まえて答える
 * - report: 日本語の課題文を読んで答える（要約・参照の妥当性まで評価する）
 * - oral_exam: 口頭試問型。1つのテーマについての小問集合に答える
 *   （専門知識の正確性まで評価し、この形式だけ合計に入れる）
 */
export type EssayQuestionType =
  | "essay"
  | "english-reading"
  | "data-analysis"
  | "mixed"
  | "lecture"
  | "report"
  | "oral_exam";

/**
 * 口頭試問型の小問集合。
 *
 * 静的データではなく、生徒が入力したテーマから毎回AIが作る。作った問題は
 * 下書きと答案に保存する（保存しないと「続ける」「もう一度書く」で別の問題になる）。
 */
export interface OralExamSubQuestion {
  /** 1始まりの問番号 */
  no: number;
  /** 設問文 */
  prompt: string;
  /** この小問の目安字数。合計は totalWordLimit と一致させる */
  wordLimit: number;
  /** 何を確かめる問いか（生徒には出さない。採点の観点） */
  aim: string;
}

export interface OralExamQuestionSet {
  /** 生徒が入力したテーマ */
  theme: string;
  /** 全体の指定字数。subQuestions の wordLimit の合計と一致する */
  totalWordLimit: number;
  subQuestions: OralExamSubQuestion[];
}

/**
 * 答案に保存する出題の文脈。管理者・講師が「生徒が何を読んで何に答えたか」を
 * 確認するために使う（essays/{id}.questionContext）。
 */
export interface EssayQuestionContextData {
  questionType?: string | null;
  wordLimit?: number | null;
  sourceText?: string | null;
  chartDataSummary?: string | null;
  lectureInfo?: string | null;
  /** 口頭試問型の小問集合（questionType="oral_exam" のときだけ） */
  oralExam?: OralExamQuestionSet | null;
}

export interface LanguageCorrection {
  location: string;
  original: string;
  suggestion: string;
  type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
  reason: string;
}

export interface QuantitativeAnalysis {
  wordCount: number;
  wordLimit: number | null;
  fillRate: number | null;
  sentenceCount: number;
  paragraphCount: number;
  paragraphRatio: {
    intro: number;
    body: number;
    conclusion: number;
  };
  evidenceCount: number;
  connectorVariety: number;
  /** アプリ内ルーブリック上の学習目標。入試の合格最低点ではない。 */
  appTargetScore: number;
  /** アプリ内目標スコアとの差。 */
  gapToTarget: number;
  /** 旧保存データとの後方互換用。新規結果では保存しない。 */
  passTarget?: number;
  /** 旧保存データとの後方互換用。新規結果では保存しない。 */
  gapToPass?: number;
}

/** 課題文の扱い。判定と上限のロジックは src/lib/essay/source-engagement.ts */
import type { SourceEngagementLevel } from "@/lib/essay/source-engagement";
export type { SourceEngagementLevel };

/** レポート課題（課題文を読んで書く）専用の講評。questionType="report" のときのみ生成。 */
export interface ReportInsights {
  /** 課題文に触れたか。合計には入れず、指標として表示する */
  engagementLevel?: SourceEngagementLevel;
  /** そう判定した根拠。生徒にそのまま見せる */
  engagementBasis?: string;
  sourceComprehension: string; // 課題文の理解度・要点把握
  summaryAccuracy: string; // 要約・言い換えの正確さ
  citationAppropriateness: string; // 引用/参照の妥当性
  analysisDepth: string; // 自分の考察の深さ・独自性
  sourceConnection: string; // 課題文と自論の接続
  misreadings: string[]; // 課題文の誤読・事実誤認の指摘
}

export interface EssayFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: Improvement[];
  topicInsights?: TopicInsights;
  /** 設問への適合判定。旧データには無い */
  taskFulfillment?: TaskFulfillment;
  /** 事実主張の確認状態。旧データには無い */
  claimChecks?: ClaimCheck[];
  /** ブラッシュアップ版で原文に無い語が増えた場合、その語（確認用） */
  brushedUpAddedFacts?: string[];
  brushedUpText?: string;
  languageCorrections?: LanguageCorrection[];
  priorityImprovement?: string;
  /** priorityImprovement が改善点と赤ペンのどちらを指しているか（v17〜） */
  priorityTarget?: "improvement" | "language";
  nextChallenge?: string;
  quantitativeAnalysis?: QuantitativeAnalysis;
  /** APが取得できず、AP合致度を十分に評価できなかった場合はfalse。 */
  apAlignmentAssessable?: boolean;
  /** 今回評価できた軸の満点。通常50、AP未取得時は40。 */
  scoreMaximum?: number;
  aiMetadata?: AiGenerationMetadata;
  /** レポート課題専用の講評（report のときのみ） */
  reportInsights?: ReportInsights;
  /** 口頭試問型の知識判定（oral_exam で判定が取れたときのみ） */
  knowledgeInsights?: KnowledgeInsights;
}

/**
 * 専門知識の正確性の講評。口頭試問型（oral_exam）でだけ生成する。
 * 採点は別呼び出し（src/lib/essay/knowledge-judge.ts）。
 */
export interface KnowledgeInsights {
  /** そう判断した根拠。生徒にそのまま見せる */
  basis: string;
  /** 答案から引用した誤り */
  errors: {
    claim: string;
    correction: string;
    severity: "critical" | "minor";
  }[];
}

export interface RepeatedIssue {
  area: string;
  count: number;
  message: string;
  /** AI が直接付与するカテゴリ。 未指定なら表示時 / 書き込み時に
   *  categorizeWeakness で fallback 分類 */
  category?:
    | "structure"
    | "logic"
    | "expression"
    | "apAlignment"
    | "responsiveness"
    /** v23 で廃止。過去の弱点レコードを読むためだけに残す */
    | "originality"
    | "reasoningMaturity"
    | "other";
}

export interface Improvement {
  area: string;
  before: string;
  after: string;
  message: string;
}

export interface EssayReviewRequest {
  essayId: string;
  ocrText: string;
  universityId: string;
  facultyId: string;
  topic?: string;
  wordLimit?: number;
  questionType?: EssayQuestionType;
  sourceText?: string;
  chartDataSummary?: string;
  pastQuestionFacultyName?: string;
  lectureInfo?: string;
  /** 出題元の識別子。管理者側で元のテーマ・過去問を辿れるように保存する */
  themeId?: string;
  pastQuestionId?: string;
  parentEssayId?: string;
  inputMode?: "image" | "text" | "dictation";
  /** 宿題から取り組んだ場合の homeworkAssignment ID。提出時に宿題を提出済みにする */
  homeworkId?: string;
  /** 執筆中に使った AIコーチ会話のID。答案に保存して管理者側の紐付けに使う */
  coachThreadId?: string;
  /**
   * 口頭試問型の小問集合。
   *
   * 出題は毎回AIが作るので、答案に保存しておかないと「もう一度書く」で
   * 同じ問題に戻れない（topic の文字列からは小問ごとの字数を復元できない）。
   */
  oralExam?: OralExamQuestionSet;
}

/** 小論文の途中保存（下書き）。テキスト入力モード専用。users/{uid}/essayDrafts/{id} */
export interface EssayDraft {
  id: string;
  directText: string;
  topic: string;
  universityId: string;
  facultyId: string;
  selectedCompoundId: string;
  customMaxLength?: number;
  writingDirection?: "vertical" | "horizontal";
  inputMode?: "text";
  universityName?: string;
  facultyName?: string;
  themeId?: string;
  pastQuestionId?: string;
  homeworkId?: string;
  /**
   * レポート課題の課題文ID。
   *
   * これが無かったころは、レポートで書いた下書きを「続ける」で開くと通常の
   * 小論文として復元され、課題文も推奨字数も失われていた。
   */
  reportMaterialId?: string;
  /**
   * 一覧表示用のテーマ名。topic は手入力時しか埋まらないため、
   * テーマ・過去問から選んだ下書きはサーバー側で名前を解決して入れる。
   */
  topicLabel?: string;
  /**
   * 口頭試問型の小問集合と、小問ごとの書きかけの答え。
   *
   * 出題はテーマから毎回AIが作るので、ここに保存しないと「続ける」で
   * 別の問題が出る（復元は毎回書かれる側を正本にする）。
   */
  oralExam?: OralExamQuestionSet;
  oralExamAnswers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EssayReviewResponse {
  essayId: string;
  scores: EssayScores;
  feedback: EssayFeedback;
  growthEvents: GrowthEvent[];
  attemptNumber?: number;
  rootEssayId?: string;
  parentEssayId?: string | null;
  retryComparison?: RetryComparison;
}

export interface RetryComparison {
  parentEssayId: string;
  parentAttemptNumber: number;
  parentSubmittedAt: string;
  parentScores: EssayScores;
  currentScores: EssayScores;
  scoreDelta: {
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    responsiveness: number;
    total: number;
  };
  resolvedWeaknesses: string[];
  newWeaknesses: string[];
  persistedWeaknesses: string[];
  wordCountDelta: number | null;
  fillRateDelta: number | null;
}

export interface GrowthEvent {
  type: "praise" | "warning" | "new_weakness";
  area: string;
  message: string;
}
