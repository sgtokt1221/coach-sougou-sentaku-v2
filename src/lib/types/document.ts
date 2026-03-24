export type DocumentType = "志望理由書" | "学業活動報告書" | "研究計画書" | "自己推薦書" | "学びの設計書";
export type DocumentStatus = "draft" | "in_review" | "reviewed" | "final";

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
