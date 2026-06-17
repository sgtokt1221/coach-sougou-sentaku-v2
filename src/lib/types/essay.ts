export type EssayStatus = "uploaded" | "ocr_confirmed" | "reviewing" | "reviewed";

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
  /** Phase 6: 出典 (manual=通常提出, homework=宿題提出, skill_check=スキルチェック, lecture=小論文講座) */
  sourceType?: "manual" | "homework" | "skill_check" | "lecture";
  /** Phase 6: 宿題から提出された場合の HomeworkAssignment ID */
  homeworkAssignmentId?: string;
  /** 小論文講座の関連問題から提出された場合の講義 ID (sourceType="lecture") */
  lectureId?: string;
  /** 管理者/講師による範囲指定インラインコメント */
  inlineComments?: EssayInlineComment[];
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
  structure: number;     // 構成 0-10
  logic: number;         // 論理性 0-10
  expression: number;    // 表現力 0-10
  apAlignment: number;   // AP合致度 0-10
  originality: number;   // 独自性 0-10
  total: number;         // 合計 0-50
}

export interface TopicInsights {
  background: string;
  relatedThemes: string[];
  deepDivePoints: string[];
  recommendedAngle: string;
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
  passTarget: number;
  gapToPass: number;
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
  questionType?: "essay" | "english-reading" | "data-analysis" | "mixed" | "lecture";
  sourceText?: string;
  chartDataSummary?: string;
  pastQuestionFacultyName?: string;
  lectureInfo?: string;
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
