import type { SkillRank } from "@/lib/types/skill-check";

/**
 * 絶対スコアと満点からパーセンテージを計算し、5段階の SkillRank (S/A/B/C/D) に変換する。
 *
 * 履歴一覧 (添削履歴・面接履歴) の小バッヂ表示で使用する想定。
 * 小論文 (50 点満点) と面接 (40 点満点) を同一基準で扱うためパーセンテージで判定し、
 * `getRankFromPercentage` の "F" は履歴用途では不要なため "D" に丸める。
 *
 * 閾値:
 * - 90%+ → "S"
 * - 75-89% → "A"
 * - 60-74% → "B"
 * - 45-59% → "C"
 * - <45% → "D"
 *
 * @param score - 取得スコア (絶対値)
 * @param maxScore - 満点 (>0 を想定。不正値は "D" を返す)
 * @returns 5 段階 SkillRank
 */
export function scoreToSkillRank(score: number, maxScore: number): SkillRank {
  if (!Number.isFinite(score) || maxScore <= 0) return "D";
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return "S";
  if (pct >= 75) return "A";
  if (pct >= 60) return "B";
  if (pct >= 45) return "C";
  return "D";
}
