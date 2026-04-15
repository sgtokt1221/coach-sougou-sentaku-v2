export interface PassedDataStatistics {
  avgEssaySubmissions: number;
  avgInterviewPractices: number;
  avgFinalEssayScore: number;
  avgFinalInterviewScore: number;
  avgWeaknessResolutionDays: number;
  topInitialWeaknesses: Array<{ area: string; frequency: number }>;
  topResolvedBeforePass: Array<{ area: string; avgDaysToResolve: number }>;
  scoreProgressionPattern: Array<{
    weeksBeforeExam: number;
    avgScore: number;
  }>;
}

export interface PassedDataResponse {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  sampleSize: number;
  statistics: PassedDataStatistics;
  insufficient: boolean;
}

export interface PassedDataCompareResponse {
  universityId: string;
  facultyId: string;
  studentCurrentScore: number;
  passedAvgAtSameWeek: number;
  scoreDiff: number;
  message: string;
  weeklyComparison: Array<{
    weeksBeforeExam: number;
    studentScore: number;
    passedAvg: number;
  }>;
}
