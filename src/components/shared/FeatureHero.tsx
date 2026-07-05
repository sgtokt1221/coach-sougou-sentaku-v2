import type { LucideIcon } from "lucide-react";

export type HeroAccent =
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "amber"
  | "rose"
  | "emerald";

const ACCENTS: Record<HeroAccent, string> = {
  teal: "from-teal-500 to-emerald-600",
  sky: "from-sky-500 to-cyan-600",
  indigo: "from-indigo-500 to-violet-600",
  violet: "from-violet-500 to-fuchsia-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
  emerald: "from-emerald-500 to-teal-600",
};

/**
 * 各機能ページ上部に置く統一ヒーロー帯（グラデ背景＋キャッチ＋説明）。
 * ちょこ添削の開始画面デザインを共通化したもの。機能ごとに accent 色で識別する。
 */
export function FeatureHero({
  eyebrow,
  title,
  description,
  Icon,
  accent = "teal",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  Icon?: LucideIcon;
  accent?: HeroAccent;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${ACCENTS[accent]} p-6 text-white shadow-sm sm:p-8 ${className}`}
    >
      <div className="relative z-10">
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            {Icon && <Icon className="size-3.5" />}
            {eyebrow}
          </div>
        )}
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -right-2 bottom-0 size-24 rounded-full bg-white/10" />
    </div>
  );
}
