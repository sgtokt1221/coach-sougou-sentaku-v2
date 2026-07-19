export type DocumentType = "志望理由書" | "学業活動報告書" | "研究計画書" | "自己推薦書" | "学びの設計書";
export type DocumentStatus = "draft" | "in_review" | "reviewed" | "final";

/**
 * 管理者主導のレビュー状態（生徒の status とは別軸）。
 * approved=承認済み / revision_requested=差し戻し(要修正) / resubmitted=再確認待ち(差し戻し後に生徒が修正)
 */
export type DocumentReviewState = "approved" | "revision_requested" | "resubmitted";

export interface DocumentReview {
  state: DocumentReviewState;
  /** 承認/差し戻しした管理者の uid・表示名（resubmitted は生徒編集起因のため省略可） */
  by?: string;
  byName?: string;
  at: string;
}

/** 未完了ウィザードの復元用進行状態。ウィザード完走後は completed:true。 */
export interface DocumentWizardState {
  /** 0-4（書類タイプ/志望校/フレームワーク/活動実績/下書き生成） */
  currentStep: number;
  frameworkType?: string;
  selectedActivityIds: string[];
  targetWordCount: number;
  /** true以降は編集画面が主。false=ウィザード再開対象 */
  completed: boolean;
  /** 下書きの各セクション本文。再開時に本文(見出しなし)から復元できないため、ここから復元する。 */
  sections?: { id: string; content: string }[];
}

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  title: string;
  content: string;
  wordCount: number;
  targetWordCount?: number;
  versions: DocumentVersion[];
  status: DocumentStatus;
  /** AIっぽさ判定の最新結果 */
  aiLikeness?: DocumentAiLikeness;
  /** 管理者による承認/差し戻しレビュー状態 */
  review?: DocumentReview;
  deadline?: string;
  linkedActivities: string[];
  createdAt: string;
  updatedAt: string;
  /** 未完了ウィザードの復元用。完走後は completed:true（または省略）。 */
  wizardState?: DocumentWizardState;
}

export interface DocumentVersion {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  feedback?: DocumentFeedback;
}

export interface DocumentFeedback {
  apAlignmentScore: number;
  structureScore: number;
  originalityScore: number;
  overallFeedback: string;
  improvements: string[];
  apSpecificNotes: string;
}

export interface DocumentCreateRequest {
  type: DocumentType;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  targetWordCount?: number;
  deadline?: string;
  frameworkType?: string;
  templateId?: string;
  initialContent?: string;
  /** 早期作成時のウィザード進行状態 */
  wizardState?: DocumentWizardState;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  "志望理由書": "志望理由書",
  "学業活動報告書": "学業活動報告書",
  "研究計画書": "研究計画書",
  "自己推薦書": "自己推薦書",
  "学びの設計書": "学びの設計書",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "下書き",
  in_review: "レビュー中",
  reviewed: "レビュー済み",
  final: "完成",
};

/** 2状態表示ラベル: draft→下書き / それ以外(in_review/reviewed/final)→完成。 */
export function documentStatusLabel2(status: DocumentStatus): string {
  return status === "draft" ? "下書き" : "完成";
}

/** 2状態判定: 完成（＝下書きでない）か。旧 in_review/reviewed も完成扱い。 */
export function isDocumentComplete(status: DocumentStatus): boolean {
  return status !== "draft";
}

export const DOCUMENT_REVIEW_LABELS: Record<DocumentReviewState, string> = {
  approved: "承認済み",
  revision_requested: "差し戻し（要修正）",
  resubmitted: "再確認待ち",
};

export type DocumentAiLikenessLevel = "low" | "medium" | "high";

/**
 * 下書きの「AIっぽさ」判定結果（最新1件のみ保持）。
 * score が高いほどAIっぽい。level は score から機械的に導出する。
 */
export interface DocumentAiLikeness {
  /** 0-100。高いほどAIっぽい */
  score: number;
  /** low 0-39 / medium 40-69 / high 70-100 */
  level: DocumentAiLikenessLevel;
  /** AIっぽいと判定した根拠（生徒向けの平易な日本語） */
  reasons: string[];
  /** 人間らしくする具体的な直し方 */
  suggestions: string[];
  /** 判定実行時刻（ISO文字列） */
  checkedAt: string;
  /** 判定時の本文文字数。現在の wordCount と異なれば「再チェック推奨」を出す */
  checkedWordCount: number;
}

/** score から AIっぽさ level を導出する。境界: 40, 70。 */
export function aiLikenessLevel(score: number): DocumentAiLikenessLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** 提出（draft→in_review）時にソフト警告を出す AIっぽさスコアの閾値。 */
export const AI_LIKENESS_SUBMIT_THRESHOLD = 60;

export const AI_LIKENESS_LEVEL_LABELS: Record<DocumentAiLikenessLevel, string> = {
  low: "人間らしい",
  medium: "要改善",
  high: "AIっぽい",
};
