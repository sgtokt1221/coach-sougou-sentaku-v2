export const CHART_COLORS = {
  primary: "oklch(var(--chart-1))",
  secondary: "oklch(var(--chart-2))",
  tertiary: "oklch(var(--chart-3))",
  quaternary: "oklch(var(--chart-4))",
  quinary: "oklch(var(--chart-5))",
} as const;

export const SCORE_COLORS = {
  structure: "oklch(var(--chart-3))",   // purple/indigo系 — 構成
  logic: "oklch(var(--chart-2))",       // amber系 — 論理性
  expression: "oklch(var(--chart-4))",  // green系 — 表現力
  apAlignment: "oklch(var(--chart-5))", // rose/orange系 — AP合致度
  originality: "oklch(var(--chart-1))", // teal系 — 独自性
} as const;

export const SCORE_LINES = [
  { key: "structure", label: "構成", color: SCORE_COLORS.structure },
  { key: "logic", label: "論理性", color: SCORE_COLORS.logic },
  { key: "expression", label: "表現力", color: SCORE_COLORS.expression },
  { key: "apAlignment", label: "AP合致度", color: SCORE_COLORS.apAlignment },
  { key: "originality", label: "独自性", color: SCORE_COLORS.originality },
] as const;

export const CHART_ANIMATION = {
  duration: 800,
  easing: "ease-out" as const,
};

export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "oklch(var(--border))",
  opacity: 0.5,
};
