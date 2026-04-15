import type { EssayScores, EssayFeedback } from "./essay";

export type AcademicCategory =
  | "law"
  | "economics"
  | "medical"
  | "literature"
  | "international"
  | "education"
  | "social"
  | "science"
  | "environment"
  | "ai_info";

export const ACADEMIC_CATEGORIES: AcademicCategory[] = [
  "law",
  "economics",
  "medical",
  "literature",
  "international",
  "education",
  "social",
  "science",
  "environment",
  "ai_info",
];

export const ACADEMIC_CATEGORY_LABELS: Record<AcademicCategory, string> = {
  law: "法律系",
  economics: "経済系",
  medical: "医療系",
  literature: "文学系",
  international: "国際系",
  education: "教育系",
  social: "社会系",
  science: "理工系",
  environment: "環境系",
  ai_info: "AI・情報系",
};

export type SkillRank = "S" | "A" | "B" | "C" | "D";

export const SKILL_RANKS: SkillRank[] = ["S", "A", "B", "C", "D"];

export interface SkillCheckQuestion {
  id: string;
  category: AcademicCategory;
  title: string;
  prompt: string;
  wordLimit: number;
  timeLimitMin: number;
  rubricHint?: string;
}

export interface SkillCheckResult {
  id: string;
  userId: string;
  category: AcademicCategory;
  questionId: string;
  essayText: string;
  wordCount: number;
  durationSec: number;
  scores: EssayScores;
  rank: SkillRank;
  feedback: EssayFeedback;
  takenAt: Date;
  version: "v1";
}

export interface SkillCheckStatus {
  latestResult: SkillCheckResult | null;
  history: SkillCheckResult[];
  daysSinceLast: number | null;
  needsRefresh: boolean;
  currentCategory: AcademicCategory | null;
  /** SC + 直近30日の練習平均の合成結果。UIはこの rank を優先表示 */
  aggregate?: import("@/lib/skill-check/aggregate").AggregateBreakdown;
}

export const SKILL_CHECK_REFRESH_DAYS = 30;
