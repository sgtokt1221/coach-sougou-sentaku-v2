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
