export type ScoreRank = "S" | "A" | "B" | "C" | "D" | "F";

export interface RankInfo {
  rank: ScoreRank;
  label: string;       // 例: "神級", "極めて優秀" 等
  gradient: string;    // Tailwind クラス（text用）例: "from-amber-400 via-amber-500 to-amber-500"
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

/** 色はダッシュボード等の RANK_META（skill-check/rank.ts）と揃える。S=金 A=緑 B=水色 C=琥珀 D=赤 */
export function getRankInfo(rank: ScoreRank): RankInfo {
  switch (rank) {
    case "S":
      return {
        rank: "S",
        label: "神級",
        gradient: "from-amber-300 via-amber-400 to-amber-600",
        glowColor: "#f59e0b",
        ringColor: "ring-amber-500",
        description: "AP要件を大きく超える完成度",
      };
    case "A":
      return {
        rank: "A",
        label: "極めて優秀",
        gradient: "from-emerald-300 via-emerald-500 to-teal-600",
        glowColor: "#10b981",
        ringColor: "ring-emerald-500",
        description: "合格水準を安定して超える",
      };
    case "B":
      return {
        rank: "B",
        label: "良好",
        gradient: "from-sky-300 via-sky-500 to-sky-600",
        glowColor: "#0ea5e9",
        ringColor: "ring-sky-500",
        description: "合格ラインに到達",
      };
    case "C":
      return {
        rank: "C",
        label: "標準",
        gradient: "from-amber-300 via-amber-400 to-amber-500",
        glowColor: "#f59e0b",
        ringColor: "ring-amber-400",
        description: "あと一歩で合格水準",
      };
    case "D":
      return {
        rank: "D",
        label: "要改善",
        gradient: "from-rose-300 via-rose-500 to-rose-600",
        glowColor: "#f43f5e",
        ringColor: "ring-rose-500",
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

/**
 * 0-10 で採点した軸を、その軸の配点スケールへ換算した表示用の点。
 *
 * 画面では分母を配点に揃える。「5/10」の横に「配点12」を出すと分母が2つ
 * あるように見え、軸を足しても合計にならないように読めるため。
 * 保存されるスコアもレーダーチャートも 0-10 のまま。
 */
export function axisPoints(score: number, weight: number): number {
  return Math.round(score * weight) / 10;
}
