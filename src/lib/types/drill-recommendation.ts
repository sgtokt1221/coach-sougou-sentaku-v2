import type { PastQuestion } from "@/data/essay-past-questions";

export interface DrillRecommendation {
  pastQuestion: PastQuestion;
  score: number;
  reasons: string[];           // 表示用「○○大学○○学部の頻出テーマ」など
  matchTargetUniversity: boolean;
  matchAcademicField: boolean;
}

export interface DrillRecommendResponse {
  recommendations: DrillRecommendation[];
  hasTargetUniversities: boolean;
}