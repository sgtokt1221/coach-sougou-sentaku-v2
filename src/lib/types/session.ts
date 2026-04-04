export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type SessionType = "coaching" | "mock_interview" | "essay_review" | "general";

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

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "一般面談",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  completed: "完了",
  cancelled: "キャンセル",
};
