// globals.css では `--chart-1: oklch(0.52 0.14 175)` のように
// oklch(...) 関数まるごとが CSS 変数に入っているので、ここでは var(--x) だけで使う。
// `oklch(var(--chart-1))` と書くと oklch(oklch(...)) に展開されて無効になる。

export const CHART_COLORS = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  quaternary: "var(--chart-4)",
  quinary: "var(--chart-5)",
} as const;

/**
 * 小論文 vs 面接を視覚的に明確に区別するための 2 系列カラー。
 * chart-1 (teal 175°) と chart-5 (rose 30°) は hue がほぼ反対で識別しやすい。
 */
export const SCORE_TYPE_COLORS = {
  essay: "var(--chart-1)",       // teal — 小論文
  interview: "var(--chart-5)",   // rose/red — 面接
} as const;

export const SCORE_COLORS = {
  structure: "var(--chart-3)",   // purple/indigo系 — 構成
  logic: "var(--chart-2)",       // amber系 — 論理性
  expression: "var(--chart-4)",  // green系 — 表現力
  apAlignment: "var(--chart-5)", // rose/orange系 — AP合致度
  originality: "var(--chart-1)", // teal系 — 独自性
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
  stroke: "var(--border)",
  opacity: 0.5,
};
