import type { EssayFeedback, EssayScores, RetryComparison } from "@/lib/types/essay";

interface ParentSnapshot {
  id: string;
  attemptNumber: number;
  submittedAt: Date | string;
  scores: EssayScores;
  feedback: EssayFeedback;
}

interface CurrentSnapshot {
  scores: EssayScores;
  feedback: EssayFeedback;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function uniqueAreas(feedback: EssayFeedback): Set<string> {
  const set = new Set<string>();
  for (const issue of feedback.repeatedIssues ?? []) {
    if (issue?.area) set.add(issue.area);
  }
  return set;
}

export function computeRetryComparison(
  parent: ParentSnapshot,
  current: CurrentSnapshot
): RetryComparison {
  const parentAreas = uniqueAreas(parent.feedback);
  const currentAreas = uniqueAreas(current.feedback);

  const resolvedWeaknesses: string[] = [];
  const persistedWeaknesses: string[] = [];
  for (const area of parentAreas) {
    if (currentAreas.has(area)) persistedWeaknesses.push(area);
    else resolvedWeaknesses.push(area);
  }
  const newWeaknesses: string[] = [];
  for (const area of currentAreas) {
    if (!parentAreas.has(area)) newWeaknesses.push(area);
  }

  const parentQa = parent.feedback.quantitativeAnalysis;
  const currentQa = current.feedback.quantitativeAnalysis;
  const wordCountDelta =
    parentQa?.wordCount !== undefined && currentQa?.wordCount !== undefined
      ? currentQa.wordCount - parentQa.wordCount
      : null;
  const fillRateDelta =
    parentQa?.fillRate !== null && parentQa?.fillRate !== undefined &&
    currentQa?.fillRate !== null && currentQa?.fillRate !== undefined
      ? currentQa.fillRate - parentQa.fillRate
      : null;

  return {
    parentEssayId: parent.id,
    parentAttemptNumber: parent.attemptNumber,
    parentSubmittedAt: toIso(parent.submittedAt),
    parentScores: parent.scores,
    currentScores: current.scores,
    scoreDelta: {
      structure: current.scores.structure - parent.scores.structure,
      logic: current.scores.logic - parent.scores.logic,
      expression: current.scores.expression - parent.scores.expression,
      apAlignment: current.scores.apAlignment - parent.scores.apAlignment,
      originality: current.scores.originality - parent.scores.originality,
      total: current.scores.total - parent.scores.total,
    },
    resolvedWeaknesses,
    newWeaknesses,
    persistedWeaknesses,
    wordCountDelta,
    fillRateDelta,
  };
}
