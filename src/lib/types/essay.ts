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
  status: "uploaded" | "ocr_confirmed" | "reviewing" | "reviewed";
  rootEssayId?: string;
  parentEssayId?: string | null;
  attemptNumber?: number;
  inputMode?: "image" | "text" | "dictation";
  retryContext?: EssayRetryContext;
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
