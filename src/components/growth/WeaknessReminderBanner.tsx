"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";
import { authFetch } from "@/lib/api/client";
import { WeaknessSourceBadge, sourceLeftBorder } from "@/components/growth/WeaknessSourceBadge";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };


const levelConfig: Record<
  WeaknessReminderLevel,
  { bg: string; border: string; badgeVariant: string; label: string; icon: React.ReactNode }
> = {
  critical: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800/50",
    badgeVariant: "destructive",
    label: "要注意",
    icon: <AlertCircle className="size-4 text-rose-500" />,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    badgeVariant: "secondary",
    label: "警告",
    icon: <AlertTriangle className="size-4 text-amber-500" />,
  },
  improving: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/50",
    badgeVariant: "secondary",
    label: "改善中",
    icon: <TrendingUp className="size-4 text-blue-500" />,
  },
  resolved: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/50",
    badgeVariant: "secondary",
    label: "解決済み",
    icon: <CheckCircle2 className="size-4 text-emerald-500" />,
  },
};

const DEFAULT_MAX_DISPLAY = 5;

interface WeaknessReminderBannerProps {
  /** 最大表示件数（デフォルト 5）*/
  maxItems?: number;
  /** compact 版: パディング縮小、レベルバッジのみ、詳細文字小さく */
  compact?: boolean;
}

export function WeaknessReminderBanner({ maxItems = DEFAULT_MAX_DISPLAY, compact = false }: WeaknessReminderBannerProps = {}) {
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
      await fetch("/api/growth/weaknesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", area }),
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
          ? Math.max(0, Math.floor((Date.now() - new Date(w.lastOccurred).getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        if (compact) {
          return (
            <div
              key={w.area}
              className={`${cfg.bg} ${cfg.border} border border-l-4 ${sourceLeftBorder(w.source)} rounded-lg flex items-center gap-2 px-2.5 py-1.5`}
            >
              {cfg.icon}
              <span className="text-xs font-medium truncate flex-1">{w.area}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{w.count}回</span>
            </div>
          );
        }
        return (
          <Card key={w.area} className={`${cfg.bg} ${cfg.border} border-l-4 ${sourceLeftBorder(w.source)}`}>
            <CardContent className="flex items-center gap-3 py-3">
              {cfg.icon}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {cfg.label}
                  </Badge>
                  <WeaknessSourceBadge source={w.source} />
                  <span className="text-sm font-medium">{w.area}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{w.count}回指摘</span>
                  {daysAgo !== null && (
                    <>
                      <span>·</span>
                      <span>最終: {daysAgo === 0 ? "今日" : `${daysAgo}日前`}</span>
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
        <p className={compact ? "text-[11px] text-muted-foreground" : "text-sm text-muted-foreground"}>
          他{remaining}件の弱点があります。
          <a href="/student/growth" className="ml-1 text-primary underline">
            すべて見る
          </a>
        </p>
      )}
    </div>
  );
}
