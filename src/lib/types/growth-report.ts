export interface WeaknessProgress {
  weakness: string;
  previousScore: number;
  currentScore: number;
  status: "improved" | "stable" | "declined";
  attempts: number;
}

export interface GrowthReport {
  id: string;
  studentId: string;
  studentName: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  generatedAt: string;
  essayStats: {
    count: number;
    avgScore: number;
    scoreChange: number;
    bestCategory: string;
    worstCategory: string;
  };
  interviewStats: {
    count: number;
    avgScore: number;
    scoreChange: number;
  };
  weaknessProgress: WeaknessProgress[];
  recommendations: string[];
  overallAssessment: string;
  /** 期間内の授業から抽出した観察 (レッスンシート実装後に付与) */
  sessionSummary?: {
    totalCount: number;
    mainTopics: string[];
    teacherObservations: string[];
    newWeaknessAreas: string[];
    latestNextAgenda?: string;
  };

  // ---- 講師編集対応の拡張 (すべて任意、後方互換) ----

  /** 講師の独自コメント。AI 生成内容とは別レイヤーで表示 */
  teacherComment?: string;
  /** 最終編集者の uid (admin/teacher) */
  editedBy?: string;
  /** 最終編集日時 (ISO8601) */
  editedAt?: string;
  /** 生徒に公開するか (デフォルト true、false なら生徒の成長タブに出ない) */
  sharedWithStudent?: boolean;
}

export interface GrowthReportSummary {
  id: string;
  studentId: string;
  studentName: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  generatedAt: string;
  essayCount: number;
  interviewCount: number;
  essayScoreChange: number;
  interviewScoreChange: number;
  overallAssessment: string;
}

export interface GenerateReportRequest {
  studentId: string;
  period: "weekly" | "monthly";
}

export interface BatchReportRequest {
  period: "weekly" | "monthly";
}
