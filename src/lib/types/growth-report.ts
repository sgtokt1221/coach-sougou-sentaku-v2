export interface WeaknessProgress {
  weakness: string;
  previousScore: number;
  currentScore: number;
  status: "improved" | "stable" | "declined";
  attempts: number;
}

/**
 * 弱点や過去テーマから AI が派生させた類題。
 * 小論文: 短いテーマ / 面接: 短い質問。
 * 講師が編集モードで追加・削除・修正可能。
 */
export interface PracticeQuestion {
  id: string;
  type: "essay" | "interview";
  /** 題目 / 質問文 (30〜50 字程度の短文) */
  title: string;
  /** 関連弱点 (なぜこれを薦めるかの 1 文) */
  relatedWeakness?: string;
  /** 関連する過去のテーマ・質問 (任意) */
  relatedPastTopic?: string;
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

  /** AI が弱点・過去問から生成した類題 (講師編集可) */
  practiceQuestions?: PracticeQuestion[];

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
