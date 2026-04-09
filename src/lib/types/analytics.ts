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

// --- Phase 3B/3C: Enhanced Analytics Types ---

export interface GapItem {
  area: string;
  studentAvg: number;
  required: number;
  gap: number;
  status: "red" | "yellow" | "green";
}

export interface UniversityGapAnalysis {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  avgEssayScore: number;
  avgInterviewScore: number;
  requiredScores: {
    essay: number;
    interview: number;
  };
  gapAnalysis: GapItem[];
  studentCount: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  essayAvg: number;
  interviewAvg: number;
  studentCount: number;
  submissionCount: number;
}

export interface WeaknessPattern {
  weakness: string;
  occurrenceCount: number;
  resolvedCount: number;
  resolutionRate: number;
  avgResolutionDays: number;
  affectedStudents: number;
  relatedUniversities: string[];
}

export interface CohortComparison {
  cohortLabel: string;
  metrics: {
    avgEssayScore: number;
    avgInterviewScore: number;
    avgWeaknessCount: number;
    avgResolutionDays: number;
  };
}

export interface UniversityGapResponse {
  gaps: UniversityGapAnalysis[];
  generatedAt: string;
}

export interface ScoreDistributionResponse {
  essay: ScoreDistribution[];
  interview: ScoreDistribution[];
  type: "essay" | "interview" | "both";
  period: string;
  generatedAt: string;
}

export interface MonthlyTrendsResponse {
  trends: MonthlyTrend[];
  generatedAt: string;
}

export interface WeaknessPatternsResponse {
  patterns: WeaknessPattern[];
  totalWeaknesses: number;
  overallResolutionRate: number;
  avgResolutionDays: number;
  generatedAt: string;
}
