/**
 * 宿題配布レコード。
 *
 * ハイブリッド設計: 提出本文は `essays` / `interviews` に直接書き込み、
 * このコレクションは「配布・締切・ステータス」のメタ情報のみを保持する。
 * これにより既存の添削履歴・スコア推移・弱点分析が自動的に宿題提出物を含む。
 *
 * Firestore パス: `users/{studentId}/homeworkAssignments/{assignmentId}`
 */
export type HomeworkStatus = "assigned" | "in_progress" | "submitted" | "reviewed";

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  assigned: "未提出",
  in_progress: "取組中",
  submitted: "提出済",
  reviewed: "確認済",
};

export interface HomeworkAssignment {
  id: string;
  studentId: string;
  /**
   * 元の成長レポート ID。
   * レポートから配布された場合は reportId。
   * 管理者が白紙から作った「カスタム宿題」の場合は "manual"。
   */
  sourceReportId: string;
  /**
   * 元の類題 ID (PracticeQuestion.id)。
   * カスタム宿題の場合は `manual_{timestamp}` のような自動採番。
   */
  practiceQuestionId: string;
  /**
   * 配布時点の snapshot。レポート側の類題を後から編集しても
   * 配布済み宿題には影響しないようにするためのコピー。
   */
  snapshot: {
    type: "essay" | "interview";
    title: string;
    hints?: string[];
    objective?: string;
    relatedWeakness?: string;
    estimatedMinutes?: number;
    /** 添削時に AP として渡す大学・学部情報。配布時に確定 */
    targetUniversity?: string;
    targetFaculty?: string;
    /** 元の小論文テーマ ID。あれば生徒は /student/essay/new?theme=ID のリッチ添削で取り組む */
    essayThemeId?: string;
    /** 元の過去問 ID。あれば生徒は /student/essay/new?pastQuestion=ID のリッチ添削で取り組む */
    pastQuestionId?: string;
    /**
     * ドリル指定。あれば生徒は該当ドリル画面で「特定の問題」を実施する。
     * "summary" → 要約ドリル(summaryPassageId の長文)、"interview" → 面接ドリル(title=設問文 + drillCategory)
     */
    drillKind?: "interview" | "summary";
    /** 面接ドリルのカテゴリ (志望理由/自己PR 等) */
    drillCategory?: string;
    /** 要約ドリルの長文 ID (例: summary-pharmacy-01) */
    summaryPassageId?: string;
  };
  status: HomeworkStatus;
  assignedAt: string;
  assignedBy: string;
  dueDate?: string;
  /** 提出時に作成した essay/interview の ID。type に応じてどちらかが入る */
  submittedEssayId?: string;
  submittedInterviewId?: string;
  /** ドリル宿題の完了時に紐づく interviewDrills/summaryDrills の doc ID */
  submittedDrillId?: string;
  submittedAt?: string;
  /** 講師確認済みフラグ。解答開示には関与せず、管理ステータスとしてのみ使用 */
  reviewedAt?: string;
  reviewedBy?: string;
  /** 講師の宿題に対するコメント (任意) */
  reviewComment?: string;
}

export interface AssignHomeworkRequest {
  /** 配布対象の practiceQuestion ID 配列 (複数選択可) */
  practiceQuestionIds: string[];
  /** 締切 (ISO 文字列、任意) */
  dueDate?: string;
}

export interface AssignHomeworkResponse {
  created: HomeworkAssignment[];
  /** 既に配布済みでスキップされたもの */
  skipped: string[];
}
