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
  /** 管理者による承認/差し戻しレビュー状態 */
  review?: DocumentReview;
  deadline?: string;
  linkedActivities: string[];
  createdAt: string;
  updatedAt: string;
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

export const DOCUMENT_REVIEW_LABELS: Record<DocumentReviewState, string> = {
  approved: "承認済み",
  revision_requested: "差し戻し（要修正）",
  resubmitted: "再確認待ち",
};
