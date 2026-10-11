"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import {
  getWeaknessReminderLevel,
  type WeaknessRecord,
  type WeaknessReminderLevel,
} from "@/lib/types/growth";

/** ダッシュボードで添削と面接の弱点を分けて出す。どちらの記録かは source で決める */
const SOURCES: Record<"essay" | "interview", WeaknessRecord["source"][]> = {
  essay: ["essay", "skill_check", "lesson", "both"],
  interview: ["interview", "interview_skill_check", "both"],
};

const TITLES = { essay: "添削の弱点", interview: "面接の弱点" } as const;

const LEVEL: Record<
  Exclude<WeaknessReminderLevel, "resolved">,
  { label: string; chip: string; icon: React.ReactNode; order: number }
> = {
  critical: {
    label: "要注意",
    chip: "bg-rose-700 text-white",
    icon: <AlertCircle className="size-3" />,
    order: 0,
  },
  warning: {
    label: "警告",
    chip: "bg-amber-700 text-white",
    icon: <AlertTriangle className="size-3" />,
    order: 1,
  },
  improving: {
    label: "改善中",
    chip: "bg-emerald-700 text-white",
    icon: <TrendingUp className="size-3" />,
    order: 2,
  },
};

const MAX_ITEMS = 3;

export function WeaknessList({ source }: { source: "essay" | "interview" }) {
  // 添削と面接の2つで同じキーを引くので、SWR が1回にまとめる
  const { data, isLoading } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>(
    "/api/growth/weaknesses?context=dashboard"
  );
  const items = (data?.weaknesses ?? [])
    .filter((w) => SOURCES[source].includes(w.source))
    .flatMap((w) => {
      const level = getWeaknessReminderLevel(w);
      return level && level !== "resolved" ? [{ ...w, level }] : [];
    })
    .sort(
      (a, b) => LEVEL[a.level].order - LEVEL[b.level].order || b.count - a.count
    );

  return (
    <section className="bg-card border-border/60 grid content-start gap-2 rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{TITLES[source]}</h2>
        {items.length > MAX_ITEMS && (
          <Link
            href="/student/growth"
            className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs"
          >
            ほか{items.length - MAX_ITEMS}件 <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-1 text-xs">
          いま気をつける弱点はありません
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {items.slice(0, MAX_ITEMS).map((w) => {
            const cfg = LEVEL[w.level];
            return (
              <li
                key={w.area}
                className="bg-muted/40 flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2"
              >
                <span
                  className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.chip}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {w.area}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {w.count}回
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
