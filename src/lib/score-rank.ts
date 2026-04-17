export type ScoreRank = "S" | "A" | "B" | "C" | "D" | "F";

export interface RankInfo {
  rank: ScoreRank;
  label: string;       // 例: "神級", "極めて優秀" 等
  gradient: string;    // Tailwind クラス（text用）例: "from-yellow-400 via-amber-500 to-orange-500"
  glowColor: string;   // box-shadow 用 hex 例: "#f59e0b"
  ringColor: string;   // Tailwind ring 用クラス
  description: string; // 一言コメント
}

export function getRankFromPercentage(percentage: number): ScoreRank {
  if (percentage >= 90) return "S";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 45) return "C";
  if (percentage > 20) return "D";
  return "F";
}

export function getRankInfo(rank: ScoreRank): RankInfo {
  switch (rank) {
    case "S":
      return {
        rank: "S",
        label: "神級",
        gradient: "from-yellow-400 via-amber-500 to-orange-500",
        glowColor: "#f59e0b",
        ringColor: "ring-amber-500",
        description: "AP要件を大きく超える完成度",
      };
    case "A":
      return {
        rank: "A",
        label: "極めて優秀",
        gradient: "from-purple-400 via-violet-500 to-purple-600",
        glowColor: "#8b5cf6",
        ringColor: "ring-purple-500",
        description: "合格水準を安定して超える",
      };
    case "B":
      return {
        rank: "B",
        label: "良好",
        gradient: "from-blue-400 via-blue-500 to-blue-600",
        glowColor: "#3b82f6",
        ringColor: "ring-blue-500",
        description: "合格ラインに到達",
      };
    case "C":
      return {
        rank: "C",
        label: "標準",
        gradient: "from-emerald-400 via-teal-500 to-emerald-600",
        glowColor: "#10b981",
        ringColor: "ring-emerald-500",
        description: "あと一歩で合格水準",
      };
    case "D":
      return {
        rank: "D",
        label: "要改善",
        gradient: "from-amber-400 via-orange-500 to-amber-600",
        glowColor: "#f59e0b",
        ringColor: "ring-amber-500",
        description: "基礎固めが必要",
      };
    case "F":
      return {
        rank: "F",
        label: "再挑戦",
        gradient: "from-slate-400 via-gray-500 to-slate-600",
        glowColor: "#6b7280",
        ringColor: "ring-slate-500",
        description: "根本から見直そう",
      };
  }
}

export function getScorePercentage(score: number, max: number): number {
  return Math.round((score / max) * 100);
}