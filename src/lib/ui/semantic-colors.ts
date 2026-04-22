/**
 * 意味ベースのカラートークン (Tailwind クラス文字列)
 *
 * Coach v2 の基調パレット:
 * - primary (ブランド / CTA / チャート主系列) = teal
 * - success / improving / resolved / 順調 = emerald
 * - warning / 注意 / 停滞 = amber
 * - danger / 要対応 / 不合格 = rose
 * - info / 中立情報 / 土曜 = sky
 * - accent (カテゴリ識別) = indigo / violet / purple
 *
 * 使い方:
 *   import { STATUS_GOOD, STATUS_DANGER } from "@/lib/ui/semantic-colors";
 *   <Badge className={STATUS_GOOD.badge}>改善中</Badge>
 */

export const BRAND = {
  dot: "bg-teal-500",
  text: "text-teal-700 dark:text-teal-300",
  bg: "bg-teal-50 dark:bg-teal-950/30",
  border: "border-teal-200 dark:border-teal-900",
  badge:
    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300",
  solid: "bg-teal-500 text-white",
} as const;

/** ポジティブ進捗 (順調 / 改善中 / 解決済み / 合格 / 上昇) */
export const STATUS_GOOD = {
  dot: "bg-emerald-500",
  text: "text-emerald-700 dark:text-emerald-300",
  bg: "bg-emerald-50 dark:bg-emerald-950/30",
  border: "border-emerald-200 dark:border-emerald-900",
  badge:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  solid: "bg-emerald-500 text-white",
} as const;

/** 警告 (注意 / 停滞 / 期限接近) */
export const STATUS_WARNING = {
  dot: "bg-amber-500",
  text: "text-amber-700 dark:text-amber-300",
  bg: "bg-amber-50 dark:bg-amber-950/30",
  border: "border-amber-200 dark:border-amber-900",
  badge:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  solid: "bg-amber-500 text-white",
} as const;

/** 危険 (要対応 / critical / 不合格 / 期限超過) */
export const STATUS_DANGER = {
  dot: "bg-rose-500",
  text: "text-rose-700 dark:text-rose-300",
  bg: "bg-rose-50 dark:bg-rose-950/30",
  border: "border-rose-200 dark:border-rose-900",
  badge:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  solid: "bg-rose-500 text-white",
} as const;

/** 中立情報 (読み取り専用 / 土曜 / 情報バナー) */
export const STATUS_INFO = {
  dot: "bg-sky-500",
  text: "text-sky-700 dark:text-sky-300",
  bg: "bg-sky-50 dark:bg-sky-950/30",
  border: "border-sky-200 dark:border-sky-900",
  badge:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  solid: "bg-sky-500 text-white",
} as const;

/** チャート系列のカラー (Recharts / SVG 用の hex) */
export const CHART_SERIES = {
  primary: "#14b8a6", // teal-500
  good: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#f43f5e", // rose-500
  info: "#0ea5e9", // sky-500
  accent1: "#6366f1", // indigo-500
  accent2: "#a855f7", // purple-500
} as const;
