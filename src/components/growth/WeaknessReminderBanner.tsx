"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  WeaknessRecord,
  WeaknessReminderLevel,
  getWeaknessReminderLevel,
} from "@/lib/types/growth";
import { authFetch } from "@/lib/api/client";
import { WeaknessSourceBadge } from "@/components/growth/WeaknessSourceBadge";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };

/**
 * 段（要注意／警告／改善中／解決済み）はベタ塗りのチップで示す。
 * 白地に左だけ色帯を立てたカードは使わない（線が増えるわりに段が区別できない）。
 * chip は白文字が 4.5:1 を満たす濃さを選ぶ。
 */
const levelConfig: Record<
  WeaknessReminderLevel,
  { chip: string; label: string; icon: React.ReactNode }
> = {
  critical: {
    chip: "bg-rose-700 text-white",
    label: "要注意",
    icon: <AlertCircle className="size-3.5" />,
  },
  warning: {
    chip: "bg-amber-700 text-white",
    label: "警告",
    icon: <AlertTriangle className="size-3.5" />,
  },
  improving: {
    chip: "bg-emerald-700 text-white",
    label: "改善中",
    icon: <TrendingUp className="size-3.5" />,
  },
  resolved: {
    chip: "bg-slate-600 text-white",
    label: "解決済み",
    icon: <CheckCircle2 className="size-3.5" />,
  },
};

const DEFAULT_MAX_DISPLAY = 5;

interface WeaknessReminderBannerProps {
  /** 最大表示件数（デフォルト 5）*/
  maxItems?: number;
  /** compact 版: パディング縮小、レベルバッジのみ、詳細文字小さく */
  compact?: boolean;
}

export function WeaknessReminderBanner({
  maxItems = DEFAULT_MAX_DISPLAY,
  compact = false,
}: WeaknessReminderBannerProps = {}) {
  const [weaknesses, setWeaknesses] = useState<WeaknessWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchWeaknesses() {
      try {
        const res = await authFetch("/api/growth/weaknesses?context=dashboard");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const items: WeaknessRecord[] = data.weaknesses ?? [];
        const withLevel = items
          .map((w) => ({ ...w, level: getWeaknessReminderLevel(w) }))
          .filter((w): w is WeaknessWithLevel => w.level !== null);
        setWeaknesses(withLevel);
      } catch {
        setWeaknesses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWeaknesses();
  }, []);

  async function handleDismiss(area: string) {
    setDismissing((prev) => new Set(prev).add(area));
    try {
      // authFetch でないと本人を特定できず、解除が保存されない
      await authFetch("/api/growth/weaknesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area }),
      });
      setWeaknesses((prev) => prev.filter((w) => w.area !== area));
    } catch {
      // noop - optimistic removal already done above on success, revert on error
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(area);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (weaknesses.length === 0) {
    return null;
  }

  const displayed = weaknesses.slice(0, maxItems);
  const remaining = weaknesses.length - maxItems;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {displayed.map((w) => {
        const cfg = levelConfig[w.level];
        const daysAgo = w.lastOccurred
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(w.lastOccurred).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : null;
        if (compact) {
          return (
            <div
              key={w.area}
              className="border-border/60 flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            >
              <span
                className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.chip}`}
              >
                {cfg.icon}
                {cfg.label}
              </span>
              <span className="flex-1 truncate text-xs font-medium">
                {w.area}
              </span>
              <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                {w.count}回
              </span>
            </div>
          );
        }
        return (
          <Card key={w.area}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cfg.chip}`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  <WeaknessSourceBadge source={w.source} />
                  <span className="text-sm font-medium">{w.area}</span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                  <span>{w.count}回指摘</span>
                  {daysAgo !== null && (
                    <>
                      <span>·</span>
                      <span>
                        最終: {daysAgo === 0 ? "今日" : `${daysAgo}日前`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-xs"
                disabled={dismissing.has(w.area)}
                onClick={() => handleDismiss(w.area)}
              >
                確認済み
              </Button>
            </CardContent>
          </Card>
        );
      })}
      {remaining > 0 && (
        <p
          className={
            compact
              ? "text-muted-foreground text-[11px]"
              : "text-muted-foreground text-sm"
          }
        >
          他{remaining}件の弱点があります。
          <a href="/student/growth" className="text-primary ml-1 underline">
            すべて見る
          </a>
        </p>
      )}
    </div>
  );
}
