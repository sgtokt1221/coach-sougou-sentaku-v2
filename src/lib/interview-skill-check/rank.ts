import type { SkillRank } from "@/lib/types/skill-check";
import { rankFromTotal } from "@/lib/skill-check/rank";

/**
 * 面接スキル（40点満点）のランク算出。境目は小論文・1回の結果画面と同じ割合。
 */
export function calculateInterviewRank(total: number): SkillRank {
  return rankFromTotal(total, 40);
}
