import type { GrowthReport, WeaknessProgress } from "@/lib/types/growth-report";

interface EssayData {
  id: string;
  submittedAt: Date;
  scores: {
    total: number;
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    originality: number;
  } | null;
}

interface InterviewData {
  id: string;
  startedAt: Date;
  scores: {
    total: number;
  } | null;
}

interface WeaknessData {
  area: string;
  count: number;
  improving: boolean;
  resolved: boolean;
}

const ESSAY_CATEGORIES: { key: string; label: string }[] = [
  { key: "structure", label: "構成" },
  { key: "logic", label: "論理性" },
  { key: "expression", label: "表現力" },
  { key: "apAlignment", label: "AP合致度" },
  { key: "originality", label: "独自性" },
];

function getPeriodRange(period: "weekly" | "monthly"): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "weekly") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setMonth(start.getMonth() - 1);
  }
  return { start, end };
}

function computeEssayStats(
  periodEssays: EssayData[],
  previousEssays: EssayData[]
): GrowthReport["essayStats"] {
  const scored = periodEssays.filter((e) => e.scores);
  const prevScored = previousEssays.filter((e) => e.scores);

  if (scored.length === 0) {
    return {
      count: 0,
      avgScore: 0,
      scoreChange: 0,
      bestCategory: "-",
      worstCategory: "-",
    };
  }

  const avgScore =
    Math.round(
      (scored.reduce((sum, e) => sum + (e.scores?.total ?? 0), 0) / scored.length) * 10
    ) / 10;

  const prevAvg =
    prevScored.length > 0
      ? Math.round(
          (prevScored.reduce((sum, e) => sum + (e.scores?.total ?? 0), 0) / prevScored.length) * 10
        ) / 10
      : 0;

  const scoreChange = prevScored.length > 0 ? Math.round((avgScore - prevAvg) * 10) / 10 : 0;

  // Calculate category averages
  const categoryAvgs: Record<string, number> = {};
  for (const cat of ESSAY_CATEGORIES) {
    const sum = scored.reduce((s, e) => {
      const scores = e.scores as Record<string, number>;
      return s + (scores[cat.key] ?? 0);
    }, 0);
    categoryAvgs[cat.key] = sum / scored.length;
  }

  let bestKey = ESSAY_CATEGORIES[0].key;
  let worstKey = ESSAY_CATEGORIES[0].key;
  for (const cat of ESSAY_CATEGORIES) {
    if (categoryAvgs[cat.key] > categoryAvgs[bestKey]) bestKey = cat.key;
    if (categoryAvgs[cat.key] < categoryAvgs[worstKey]) worstKey = cat.key;
  }

  const bestCategory = ESSAY_CATEGORIES.find((c) => c.key === bestKey)?.label ?? "-";
  const worstCategory = ESSAY_CATEGORIES.find((c) => c.key === worstKey)?.label ?? "-";

  return {
    count: periodEssays.length,
    avgScore,
    scoreChange,
    bestCategory,
    worstCategory,
  };
}

function computeInterviewStats(
  periodInterviews: InterviewData[],
  previousInterviews: InterviewData[]
): GrowthReport["interviewStats"] {
  const scored = periodInterviews.filter((i) => i.scores);
  const prevScored = previousInterviews.filter((i) => i.scores);

  if (scored.length === 0) {
    return { count: 0, avgScore: 0, scoreChange: 0 };
  }

  const avgScore =
    Math.round(
      (scored.reduce((sum, i) => sum + (i.scores?.total ?? 0), 0) / scored.length) * 10
    ) / 10;

  const prevAvg =
    prevScored.length > 0
      ? Math.round(
          (prevScored.reduce((sum, i) => sum + (i.scores?.total ?? 0), 0) / prevScored.length) * 10
        ) / 10
      : 0;

  const scoreChange = prevScored.length > 0 ? Math.round((avgScore - prevAvg) * 10) / 10 : 0;

  return {
    count: periodInterviews.length,
    avgScore,
    scoreChange,
  };
}

function computeWeaknessProgress(weaknesses: WeaknessData[]): WeaknessProgress[] {
  return weaknesses
    .filter((w) => !w.resolved)
    .map((w) => {
      let status: "improved" | "stable" | "declined";
      if (w.improving) {
        status = "improved";
      } else if (w.count >= 5) {
        status = "declined";
      } else {
        status = "stable";
      }

      // Use count as a proxy for score (higher count = lower score)
      const currentScore = Math.max(0, 10 - w.count);
      const previousScore = w.improving ? currentScore - 1 : currentScore + 1;

      return {
        weakness: w.area,
        previousScore: Math.max(0, Math.min(10, previousScore)),
        currentScore: Math.max(0, Math.min(10, currentScore)),
        status,
        attempts: w.count,
      };
    })
    .sort((a, b) => a.currentScore - b.currentScore);
}

function generateRecommendations(
  essayStats: GrowthReport["essayStats"],
  interviewStats: GrowthReport["interviewStats"],
  weaknessProgress: WeaknessProgress[]
): string[] {
  const recommendations: string[] = [];

  // Essay-based recommendations
  if (essayStats.count === 0) {
    recommendations.push("今期間中に小論文の提出がありませんでした。定期的な練習を心がけましょう。");
  } else if (essayStats.scoreChange < -3) {
    recommendations.push(
      `小論文スコアが${Math.abs(essayStats.scoreChange)}点下がっています。特に「${essayStats.worstCategory}」に注力しましょう。`
    );
  } else if (essayStats.scoreChange > 3) {
    recommendations.push(
      `小論文スコアが${essayStats.scoreChange}点上昇しました。この調子で継続しましょう。`
    );
  }

  if (essayStats.worstCategory !== "-" && essayStats.worstCategory !== essayStats.bestCategory) {
    recommendations.push(
      `「${essayStats.worstCategory}」が最も改善の余地があります。意識的に強化しましょう。`
    );
  }

  // Interview-based recommendations
  if (interviewStats.count === 0) {
    recommendations.push("面接練習を行いましょう。定期的な模擬面接が効果的です。");
  } else if (interviewStats.scoreChange < -3) {
    recommendations.push("面接スコアが低下傾向です。回答の具体性と志望理由の明確化を意識しましょう。");
  }

  // Weakness-based recommendations
  const stuckWeaknesses = weaknessProgress.filter(
    (w) => w.status === "declined" || (w.status === "stable" && w.attempts >= 3)
  );
  if (stuckWeaknesses.length > 0) {
    const areas = stuckWeaknesses.slice(0, 3).map((w) => `「${w.weakness}」`).join("、");
    recommendations.push(
      `${areas}が長期的に改善されていません。異なるアプローチでの練習を検討しましょう。`
    );
  }

  const improvedWeaknesses = weaknessProgress.filter((w) => w.status === "improved");
  if (improvedWeaknesses.length > 0) {
    const areas = improvedWeaknesses.slice(0, 3).map((w) => `「${w.weakness}」`).join("、");
    recommendations.push(`${areas}に改善が見られます。引き続き定着を目指しましょう。`);
  }

  if (recommendations.length === 0) {
    recommendations.push("現在の学習ペースを維持しましょう。");
  }

  return recommendations;
}

function generateOverallAssessment(
  essayStats: GrowthReport["essayStats"],
  interviewStats: GrowthReport["interviewStats"],
  weaknessProgress: WeaknessProgress[]
): string {
  const totalActivity = essayStats.count + interviewStats.count;
  const improvedCount = weaknessProgress.filter((w) => w.status === "improved").length;
  const declinedCount = weaknessProgress.filter((w) => w.status === "declined").length;

  if (totalActivity === 0) {
    return "今期間は学習活動がありませんでした。計画的に取り組みましょう。";
  }

  const parts: string[] = [];

  // Activity level
  if (totalActivity >= 10) {
    parts.push("非常に積極的に学習に取り組んでいます。");
  } else if (totalActivity >= 5) {
    parts.push("安定した学習ペースを維持しています。");
  } else {
    parts.push("もう少し学習量を増やすことをお勧めします。");
  }

  // Score trend
  if (essayStats.scoreChange > 3) {
    parts.push("小論文のスコアは順調に向上しています。");
  } else if (essayStats.scoreChange < -3) {
    parts.push("小論文のスコアが低下傾向です。基礎の見直しが必要です。");
  }

  // Weakness progress
  if (improvedCount > declinedCount) {
    parts.push("弱点の改善が進んでおり、成長が感じられます。");
  } else if (declinedCount > improvedCount) {
    parts.push("いくつかの弱点が固定化しつつあります。重点的な対策を検討しましょう。");
  }

  return parts.join("");
}

export function generateGrowthReport(params: {
  studentId: string;
  studentName: string;
  period: "weekly" | "monthly";
  periodEssays: EssayData[];
  previousEssays: EssayData[];
  periodInterviews: InterviewData[];
  previousInterviews: InterviewData[];
  weaknesses: WeaknessData[];
}): GrowthReport {
  const { start, end } = getPeriodRange(params.period);

  const essayStats = computeEssayStats(params.periodEssays, params.previousEssays);
  const interviewStats = computeInterviewStats(params.periodInterviews, params.previousInterviews);
  const weaknessProgress = computeWeaknessProgress(params.weaknesses);
  const recommendations = generateRecommendations(essayStats, interviewStats, weaknessProgress);
  const overallAssessment = generateOverallAssessment(essayStats, interviewStats, weaknessProgress);

  const reportId = `report_${params.studentId}_${params.period}_${Date.now()}`;

  return {
    id: reportId,
    studentId: params.studentId,
    studentName: params.studentName,
    period: params.period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    generatedAt: new Date().toISOString(),
    essayStats,
    interviewStats,
    weaknessProgress,
    recommendations,
    overallAssessment,
  };
}

export { getPeriodRange };
