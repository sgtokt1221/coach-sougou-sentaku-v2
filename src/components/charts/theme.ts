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

/**
 * 小論文の軸ごとの色。線グラフで5〜6本を同時に描くので、色相を離して割り当てる。
 *
 * 以前は議論の成熟度が未定義の --chart-6 を参照しており、フォールバックで
 * 構成と同じ紫になっていた（凡例を見ないとどちらの線か分からなかった）。
 * 独自性(175)と表現力(145)も30°しか離れておらず、緑同士で見分けにくかった。
 * いまは 280 / 75 / 235 / 175 / 340 / 30 で、隣接する色相を45°以上離している。
 */
export const SCORE_COLORS = {
  structure: "var(--chart-3)",         // 紫 280° — 構成
  logic: "var(--chart-2)",             // 琥珀 75° — 論理性
  expression: "var(--chart-6)",        // 青 235° — 表現力
  apAlignment: "var(--chart-5)",       // 橙 30° — AP合致度
  originality: "var(--chart-1)",       // ティール 175° — 独自性
  reasoningMaturity: "var(--chart-7)", // ピンク 340° — 議論の成熟度
} as const;

/**
 * 合計に入る5軸（v7〜）。AP合致度は合計外の補助指標なので含めない。
 * APを見たい画面は AP_SCORE_LINE を足す。
 */
export const SCORE_LINES = [
  { key: "structure", label: "構成", color: SCORE_COLORS.structure },
  { key: "logic", label: "論理性", color: SCORE_COLORS.logic },
  { key: "expression", label: "表現力", color: SCORE_COLORS.expression },
  { key: "originality", label: "独自性", color: SCORE_COLORS.originality },
  {
    key: "reasoningMaturity",
    label: "議論の成熟度",
    color: SCORE_COLORS.reasoningMaturity,
  },
] as const;

/** AP合致度（合計外）。志望校との相性を見る画面だけで足す */
export const AP_SCORE_LINE = {
  key: "apAlignment",
  label: "AP合致度（合計外）",
  color: SCORE_COLORS.apAlignment,
} as const;

/** 面接スコアの共通5軸（全モード必須項目）の系列定義 */
export const INTERVIEW_SCORE_LINES = [
  { key: "clarity", label: "明確さ", color: "var(--chart-1)" },
  { key: "apAlignment", label: "AP合致度", color: "var(--chart-5)" },
  { key: "enthusiasm", label: "熱意", color: "var(--chart-2)" },
  { key: "specificity", label: "具体性", color: "var(--chart-3)" },
  { key: "bodyLanguage", label: "ボディランゲージ", color: "var(--chart-4)" },
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
