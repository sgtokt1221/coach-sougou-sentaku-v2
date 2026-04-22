"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };

const levelLabel: Record<WeaknessReminderLevel, string> = {
  critical: "要注意",
  warning: "警告",
  improving: "改善中",
  resolved: "解決済み",
};

const levelBadgeClass: Record<WeaknessReminderLevel, string> = {
  critical: "border-rose-300 bg-rose-100 text-rose-700",
  warning: "border-amber-300 bg-amber-100 text-amber-700",
  improving: "border-emerald-300 bg-emerald-100 text-emerald-700",
  resolved: "border-emerald-300 bg-emerald-100 text-emerald-700",
};

const MAX_DISPLAY = 3;

export function WeaknessReminderCard() {
  const [weaknesses, setWeaknesses] = useState<WeaknessWithLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeaknesses() {
      try {
        const res = await fetch("/api/growth/weaknesses?context=essay_new");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const items: WeaknessRecord[] = data.weaknesses ?? [];
        const withLevel = items
          .map((w) => ({ ...w, level: getWeaknessReminderLevel(w) }))
          .filter((w): w is WeaknessWithLevel => w.level !== null)
          .slice(0, MAX_DISPLAY);
        setWeaknesses(withLevel);
      } catch {
        setWeaknesses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWeaknesses();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (weaknesses.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-4" />
          書く前にチェック
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {weaknesses.map((w) => {
          const daysAgo = w.lastOccurred
            ? Math.max(0, Math.floor((Date.now() - new Date(w.lastOccurred).getTime()) / (1000 * 60 * 60 * 24)))
            : null;
          return (
            <div key={w.area} className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`shrink-0 text-xs ${levelBadgeClass[w.level]}`}
              >
                {levelLabel[w.level]}
              </Badge>
              <span className="text-sm text-amber-900 flex-1">{w.area}</span>
              <span className="text-xs text-amber-700/70">
                {w.count}回{daysAgo !== null && ` · ${daysAgo === 0 ? "今日" : `${daysAgo}日前`}`}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
