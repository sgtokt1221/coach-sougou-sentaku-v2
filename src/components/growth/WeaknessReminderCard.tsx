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
  critical: "border-red-300 bg-red-100 text-red-700",
  warning: "border-yellow-300 bg-yellow-100 text-yellow-700",
  improving: "border-blue-300 bg-blue-100 text-blue-700",
  resolved: "border-green-300 bg-green-100 text-green-700",
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
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
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
              <span className="text-sm text-yellow-900 flex-1">{w.area}</span>
              <span className="text-xs text-yellow-700/70">
                {w.count}回{daysAgo !== null && ` · ${daysAgo === 0 ? "今日" : `${daysAgo}日前`}`}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
