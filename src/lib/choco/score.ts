import type { ChocoScores } from "@/lib/types/choco";

/**
 * 3軸(各0-10)を本添削と同じ 0-50 スケールへ換算。
 * total = round((logic + coherence + expression) / 30 * 50)
 */
export function computeChocoTotal(
  s: Pick<ChocoScores, "logic" | "coherence" | "expression">,
): number {
  const clamp = (n: number) => Math.max(0, Math.min(10, n));
  const sum = clamp(s.logic) + clamp(s.coherence) + clamp(s.expression);
  return Math.round((sum / 30) * 50);
}
