import type { SkillRank } from "@/lib/types/skill-check";

export function calculateRank(total: number): SkillRank {
  if (total >= 45) return "S";
  if (total >= 40) return "A";
  if (total >= 32) return "B";
  if (total >= 22) return "C";
  return "D";
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
    minScore: 40,
  },
  B: {
    label: "B",
    description: "MARCH・関関同立水準、論理は明確",
    textColor: "text-sky-950",
    bgColor: "bg-sky-100",
    borderColor: "border-sky-500",
    gradientFrom: "from-sky-300",
    gradientTo: "to-sky-600",
    minScore: 32,
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
    minScore: 22,
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
