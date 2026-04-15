import type { SkillRank } from "@/lib/types/skill-check";
import { INTERVIEW_SKILL_RANK_THRESHOLDS } from "@/lib/types/interview-skill-check";

/**
 * 面接スキル（40点満点）のランク算出。
 * 小論文（50点満点）と基準が異なる点に注意。
 */
export function calculateInterviewRank(total: number): SkillRank {
  if (total >= INTERVIEW_SKILL_RANK_THRESHOLDS.S) return "S";
  if (total >= INTERVIEW_SKILL_RANK_THRESHOLDS.A) return "A";
  if (total >= INTERVIEW_SKILL_RANK_THRESHOLDS.B) return "B";
  if (total >= INTERVIEW_SKILL_RANK_THRESHOLDS.C) return "C";
  return "D";
}
