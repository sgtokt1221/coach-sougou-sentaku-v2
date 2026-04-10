"use client";

import { cn } from "@/lib/utils";

export type SegmentAccent =
  | "blue"
  | "amber"
  | "violet"
  | "emerald"
  | "rose"
  | "slate";

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  accent?: SegmentAccent;
}

interface SegmentControlProps<T extends string = string> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentOption<T>[];
  /** デフォルトのアクセント色（オプションごとに指定がない場合） */
  defaultAccent?: SegmentAccent;
  className?: string;
  /** 親コンテナの幅いっぱいに広げる（均等割り付け） */
  fullWidth?: boolean;
  size?: "sm" | "md";
}

const ACCENT_ACTIVE_RING: Record<SegmentAccent, string> = {
  blue: "ring-blue-500/30",
  amber: "ring-amber-500/30",
  violet: "ring-violet-500/30",
  emerald: "ring-emerald-500/30",
  rose: "ring-rose-500/30",
  slate: "ring-slate-500/30",
};

const ACCENT_ACTIVE_TEXT: Record<SegmentAccent, string> = {
  blue: "text-blue-700 dark:text-blue-300",
  amber: "text-amber-700 dark:text-amber-300",
  violet: "text-violet-700 dark:text-violet-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  rose: "text-rose-700 dark:text-rose-300",
  slate: "text-slate-700 dark:text-slate-300",
};

const ACCENT_ACTIVE_BADGE: Record<SegmentAccent, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  violet:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  emerald:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  slate: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
};

/**
 * 汎用 pill 型セグメントコントロール。
 * shadcn Tabs の代替として、シンプルで美しい状態切替UIを提供する。
 *
 * 使い方:
 * ```tsx
 * const [active, setActive] = useState("a");
 * <SegmentControl
 *   value={active}
 *   onChange={setActive}
 *   options={[
 *     { id: "a", label: "概要", count: 12 },
 *     { id: "b", label: "詳細", count: 4 },
 *   ]}
 * />
 * ```
 */
export function SegmentControl<T extends string = string>({
  value,
  onChange,
  options,
  defaultAccent = "blue",
  className,
  fullWidth = false,
  size = "md",
}: SegmentControlProps<T>) {
  const padX = size === "sm" ? "px-2.5" : "px-3.5";
  const padY = size === "sm" ? "py-1.5" : "py-2";
  const fontSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={cn(
        "w-full overflow-x-auto -mx-1 px-1 scrollbar-none",
        className,
      )}
    >
      <div
        role="tablist"
        className={cn(
          "items-center gap-1 rounded-xl border border-border/40 bg-muted/40 p-1 shadow-sm",
          fullWidth ? "flex w-full" : "inline-flex",
        )}
      >
        {options.map((opt) => {
          const isActive = opt.id === value;
          const accent = opt.accent ?? defaultAccent;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200",
                padX,
                padY,
                fontSize,
                fullWidth && "flex-1",
                isActive
                  ? cn(
                      "bg-background shadow-sm ring-1",
                      ACCENT_ACTIVE_TEXT[accent],
                      ACCENT_ACTIVE_RING[accent],
                    )
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span>{opt.label}</span>
              {typeof opt.count === "number" && (
                <span
                  className={cn(
                    "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors",
                    isActive
                      ? ACCENT_ACTIVE_BADGE[accent]
                      : "bg-muted text-muted-foreground group-hover:bg-background",
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
