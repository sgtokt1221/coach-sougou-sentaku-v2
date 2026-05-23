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
  };
  status: HomeworkStatus;
  assignedAt: string;
  assignedBy: string;
  dueDate?: string;
  /** 提出時に作成した essay/interview の ID。type に応じてどちらかが入る */
  submittedEssayId?: string;
  submittedInterviewId?: string;
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
