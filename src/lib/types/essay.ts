import type { AiGenerationMetadata } from "@/lib/types/ai";

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

export interface EssayScores {
  structure: number; // 構成 0-10
  logic: number; // 論理性 0-10
  expression: number; // 表現力 0-10
  apAlignment: number; // AP合致度 0-10
  originality: number; // 独自性 0-10
  total: number; // 合計 0-50
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
 */
export type EssayQuestionType =
  | "essay"
  | "english-reading"
  | "data-analysis"
  | "mixed"
  | "lecture"
  | "report";

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

/** レポート課題（課題文を読んで書く）専用の講評。questionType="report" のときのみ生成。 */
export interface ReportInsights {
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
  brushedUpText?: string;
  languageCorrections?: LanguageCorrection[];
  priorityImprovement?: string;
  nextChallenge?: string;
  quantitativeAnalysis?: QuantitativeAnalysis;
  /** APが取得できず、AP合致度を十分に評価できなかった場合はfalse。 */
  apAlignmentAssessable?: boolean;
  /** 今回評価できた軸の満点。通常50、AP未取得時は40。 */
  scoreMaximum?: number;
  aiMetadata?: AiGenerationMetadata;
  /** レポート課題専用の講評（report のときのみ） */
  reportInsights?: ReportInsights;
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
    | "originality"
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
   * 一覧表示用のテーマ名。topic は手入力時しか埋まらないため、
   * テーマ・過去問から選んだ下書きはサーバー側で名前を解決して入れる。
   */
  topicLabel?: string;
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
    originality: number;
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
