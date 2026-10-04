import type { SkillRank } from "@/lib/types/skill-check";
import { getRankFromPercentage } from "@/lib/score-rank";

/**
 * 合計点からランクを出す。境目は1回の結果画面と同じ割合（score-rank.ts）を使う。
 *
 * 以前は小論文 45/40/32/22（50点）・面接 36/32/25/17（40点）と別の境目を持って
 * いて、1回の結果はAなのに、同じ点が並ぶと平均のランクはBになることがあった。
 * ランクはS〜Dなので、F（20%以下）はDにまとめる。
 */
export function rankFromTotal(total: number, max: number): SkillRank {
  const rank = getRankFromPercentage(max > 0 ? (total / max) * 100 : 0);
  return rank === "F" ? "D" : rank;
}

/** 小論文（50点満点）のランク */
export function calculateRank(total: number): SkillRank {
  return rankFromTotal(total, 50);
}

export interface RankMeta {
  label: string;
  description: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  /** S用の特別演出（発光グロー等）を有効化するか */
  premium?: boolean;
  minScore: number;
}

export const RANK_META: Record<SkillRank, RankMeta> = {
  S: {
    label: "S",
    description: "旧帝・早慶レベルで完成形に近い",
    textColor: "text-amber-950",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-500",
    // ゴールドグラデーション: 明るい金色→濃い琥珀
    gradientFrom: "from-amber-300",
    gradientTo: "to-amber-600",
    premium: true,
    minScore: 45,
  },
  A: {
    label: "A",
    description: "難関大合格水準",
    textColor: "text-emerald-950",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-500",
    gradientFrom: "from-emerald-300",
    gradientTo: "to-teal-600",
    minScore: 37.5,
  },
  B: {
    label: "B",
    description: "MARCH・関関同立水準、論理は明確",
    textColor: "text-sky-950",
    bgColor: "bg-sky-100",
    borderColor: "border-sky-500",
    gradientFrom: "from-sky-300",
    gradientTo: "to-sky-600",
    minScore: 30,
  },
  C: {
    label: "C",
    description: "基礎は押さえているが構成・独自性に課題",
    textColor: "text-amber-950",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-400",
    // S（ゴールド）と区別するため、明確にオレンジ系
    gradientFrom: "from-amber-300",
    gradientTo: "to-amber-500",
    minScore: 22.5,
  },
  D: {
    label: "D",
    description: "構成・論理から再構築が必要",
    textColor: "text-rose-950",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-500",
    gradientFrom: "from-rose-300",
    gradientTo: "to-rose-600",
    minScore: 0,
  },
};
