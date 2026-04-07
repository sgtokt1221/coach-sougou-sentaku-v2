export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type SessionType = "coaching" | "mock_interview" | "essay_review" | "general" | "group_review";

export interface Session {
  id: string;
  teacherId: string;
  studentId: string;
  teacherName: string;
  studentName: string;
  createdByAdminId?: string;
  type: SessionType;
  status: SessionStatus;
  scheduledAt: string;
  duration?: number;
  meetLink?: string;
  notes?: string;
  summary?: SessionSummary;
  sharedWithStudent: boolean;
  // Group review fields
  theme?: string;
  targetWeakness?: string;
  submissionDeadline?: string;
  votingEnabled?: boolean;
  participantIds?: string[];
  maxParticipants?: number;
  // Standard fields
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  overview: string;
  topicsDiscussed: string[];
  strengths: string[];
  improvements: string[];
  actionItems: ActionItem[];
  generatedAt: string;
}

export interface ActionItem {
  task: string;
  assignee: "student" | "teacher";
  deadline?: string;
  completed: boolean;
}

export interface SessionCreateRequest {
  teacherId: string;
  studentId: string;
  teacherName: string;
  studentName: string;
  type: SessionType;
  scheduledAt: string;
  meetLink?: string;
  notes?: string;
}

export interface GroupSessionFields {
  participantIds: string[];
  maxParticipants: number;
  theme?: string;
  targetWeakness?: string;
  submissionDeadline: string;
  votingEnabled: boolean;
}

export interface SessionSubmission {
  id: string;
  sessionId: string;
  essayId: string;
  userId: string;
  anonymousLabel: string;
  ocrText: string;
  topic?: string;
  scores?: { total: number };
  voteCount: number;
  selectedByTeacher: boolean;
  createdAt: string;
}

export interface SubmissionVote {
  voterId: string;
  submissionId: string;
  createdAt: string;
}

export interface GroupSessionCreateRequest {
  teacherId: string;
  teacherName: string;
  type: "group_review";
  scheduledAt: string;
  meetLink?: string;
  notes?: string;
  theme?: string;
  targetWeakness?: string;
  submissionDeadline: string;
  maxParticipants?: number;
  participantIds?: string[];
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "一般面談",
  group_review: "グループ添削",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  completed: "完了",
  cancelled: "キャンセル",
};
