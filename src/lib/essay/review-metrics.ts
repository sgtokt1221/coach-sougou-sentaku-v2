import type { QuantitativeAnalysis } from "@/lib/types/essay";

export const ESSAY_APP_TARGET_SCORE = 35;

const CONNECTORS = [
  "しかし",
  "だが",
  "一方で",
  "また",
  "さらに",
  "加えて",
  "したがって",
  "そのため",
  "なぜなら",
  "つまり",
  "例えば",
  "具体的には",
] as const;

function countChars(text: string): number {
  return Array.from(text.replace(/\s/g, "")).length;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function toPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function paragraphRatio(paragraphs: string[]): {
  intro: number;
  body: number;
  conclusion: number;
} {
  if (paragraphs.length === 0) {
    return { intro: 0, body: 0, conclusion: 0 };
  }

  const lengths = paragraphs.map(countChars);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (paragraphs.length === 1) {
    return { intro: 0, body: 100, conclusion: 0 };
  }

  const intro = toPercent(lengths[0], total);
  const conclusion = toPercent(lengths[lengths.length - 1], total);
  return {
    intro,
    body: Math.max(0, 100 - intro - conclusion),
    conclusion,
  };
}

function estimateEvidenceCount(text: string): number {
  const sentences = text
    .split(/[。！？!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const evidencePattern =
    /(?:例えば|具体的には|実際に|調査|統計|データ|によると|経験|体験|結果|成果|[\d０-９]+(?:[.,，．]\d+)?(?:%|％|人|件|年|回|円|倍|点))/;
  return sentences.filter((sentence) => evidencePattern.test(sentence)).length;
}

export function calculateEssayMetrics(
  essayText: string,
  wordLimit: number | undefined,
  totalScore: number,
  appTargetScore = ESSAY_APP_TARGET_SCORE
): QuantitativeAnalysis {
  const paragraphs = splitParagraphs(essayText);
  const wordCount = countChars(essayText);
  const normalizedLimit =
    typeof wordLimit === "number" && wordLimit > 0
      ? Math.round(wordLimit)
      : null;

  return {
    wordCount,
    wordLimit: normalizedLimit,
    fillRate: normalizedLimit
      ? Math.round((wordCount / normalizedLimit) * 100)
      : null,
    sentenceCount: (essayText.match(/[。！？!?]/g) ?? []).length,
    paragraphCount: paragraphs.length,
    paragraphRatio: paragraphRatio(paragraphs),
    evidenceCount: estimateEvidenceCount(essayText),
    connectorVariety: CONNECTORS.filter((connector) =>
      essayText.includes(connector)
    ).length,
    appTargetScore,
    gapToTarget: Math.max(0, appTargetScore - totalScore),
  };
}
