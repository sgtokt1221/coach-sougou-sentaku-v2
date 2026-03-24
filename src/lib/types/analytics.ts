export interface BigQueryEssayLog {
  essay_id: string;
  user_id: string;
  university_id: string;
  faculty_id: string;
  submitted_at: string;
  score_structure: number;
  score_logic: number;
  score_expression: number;
  score_ap_alignment: number;
  score_originality: number;
  score_total: number;
  word_count: number;
  topic: string;
  weakness_tags: string[];
  improvement_tags: string[];
}

export interface BigQueryInterviewLog {
  interview_id: string;
  user_id: string;
  university_id: string;
  faculty_id: string;
  started_at: string;
  duration_seconds: number;
  mode: string;
  score_clarity: number;
  score_ap_alignment: number;
  score_enthusiasm: number;
  score_specificity: number;
  score_total: number;
  weakness_tags: string[];
  question_count: number;
}

export interface AnalyticsOverview {
  totalEssays: number;
  totalInterviews: number;
  avgEssayScore: number;
  avgInterviewScore: number;
  monthlyTrend: { month: string; essays: number; interviews: number; avgScore: number }[];
  universityPopularity: { universityName: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
}

export interface WeaknessAnalytics {
  topWeaknesses: { area: string; count: number; improvementRate: number }[];
  avgDaysToResolve: number;
  universityGap: { universityName: string; requiredSkills: string[]; studentGap: string[] }[];
  improvementPatterns: {
    pattern: string;
    successRate: number;
    avgSubmissions: number;
    avgDaysToImprove: number;
  }[];
}

export interface GrowthReport {
  summary: string;
  comparisonToAvg: { area: string; myScore: number; avgScore: number }[];
  recommendations: string[];
  generatedAt: string;
}
