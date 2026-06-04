import type { PracticeQuestion } from "@/lib/types/growth-report";

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
  /** 授業形態 (1 対 1 のみ。online=Meet 利用 / offline=対面)。未設定は meetLink 有無でフォールバック判定 */
  format?: "online" | "offline";
  scheduledAt: string;
  duration?: number;
  meetLink?: string;
  notes?: string;
  summary?: SessionSummary;
  /** 授業前の AI 生成台本 (講師編集可) */
  prepPlan?: LessonPrepPlan;
  /** 授業前に AI 生成した「今日使う類題」(台本とセット生成、講師編集可) */
  practiceQuestions?: PracticeQuestion[];
  /** 授業後の振り返り */
  debrief?: LessonDebrief;
  /** 授業実際開始時刻 (講師が「授業を開始」押下時) */
  startedAt?: string;
  /** 授業実際終了時刻 (「授業を終了」押下時) */
  endedAt?: string;
  /** Firebase Storage の署名付き URL (録音再生用) */
  recordingUrl?: string;
  /** Storage 上の path (再取得・削除用) */
  recordingPath?: string;
  recordingDurationSec?: number;
  recordingSizeBytes?: number;
  /** Whisper 文字起こし結果 (保持して再実行回避) */
  transcription?: LessonTranscription;
  /** Google Calendar event ID (同期更新/削除に使用) */
  calendarEventId?: string;
  /** Phase 2: 両側録音の進行状態 (両ブラウザで onSnapshot 同期) */
  recordingState?: SessionRecordingState;
  /** Phase 2: 生徒側録音 */
  studentRecordingUrl?: string;
  studentRecordingPath?: string;
  studentRecordingDurationSec?: number;
  studentRecordingSizeBytes?: number;
  /** Phase 2: 生徒側 Whisper 結果 (マージ前に保持) */
  studentTranscription?: LessonTranscription;
  /** 話者分離した授業記録 (講師/生徒を時系列マージした文字起こし) */
  lessonTranscript?: LessonTranscriptRecord;
  sharedWithStudent: boolean;
  // Group review fields
  theme?: string;
  targetWeakness?: string;
  submissionDeadline?: string;
  votingEnabled?: boolean;
  participantIds?: string[];
  maxParticipants?: number;
  /** 欠席連絡の記録 (status=cancelled を欠席として運用) */
  absenceReportedBy?: "student" | "admin" | "teacher";
  absenceReportedAt?: string;
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

/** 授業前の AI 生成台本 (ソクラテス式の問いかけリスト) */
export interface LessonPrepPlan {
  goal: string;
  questions: string[];
  cautions: string[];
  /** 今日のテーマ (短い見出し。AI 生成、講師編集可) */
  theme?: string;
  generatedAt: string;
  generatedBy: "ai" | "teacher" | "ai_then_teacher";
}

/** Phase 2: 両側録音の進行状態 */
export interface SessionRecordingState {
  teacherRecording: boolean;
  teacherStartedAt?: string;
  studentRecording: boolean;
  studentStartedAt?: string;
  /** 講師が「授業を終了」を押した時刻 (生徒側の自動停止トリガー) */
  stopRequestedAt?: string;
}

/** Whisper 文字起こし結果 */
export interface LessonTranscription {
  fullText: string;
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  transcribedAt: string;
}

/** 授業後の振り返り (講師入力 + AI 下書き) */
export interface LessonDebrief {
  /** 講師の気づきメモ (自由記述) */
  notes: string;
  /** 授業で新たに発見した弱点の area 名 */
  newWeaknessAreas: string[];
  /** 次回セッションの台本生成に使うシード */
  nextAgendaSeed: string;
  /** AI が文字起こしから抽出した反省点/課題 (次回授業の反省点として表示・台本に反映) */
  reflectionPoints?: string[];
  /** 最終更新時刻 ISO */
  capturedAt: string;
}

/** 話者分離した授業記録 (録音文字起こし。講師/生徒の別ストリームを時系列マージ) */
export interface LessonTranscriptRecord {
  fullText: string;
  segments: Array<{
    speaker: "teacher" | "student";
    /** 授業開始からの相対秒 (時系列ソート済み) */
    start: number;
    text: string;
  }>;
  transcribedAt: string;
}

export interface SessionCreateRequest {
  teacherId: string;
  studentId: string;
  teacherName: string;
  studentName: string;
  type: SessionType;
  format?: "online" | "offline";
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
  cancelled: "欠席",
};
