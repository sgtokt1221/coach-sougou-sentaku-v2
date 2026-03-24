"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };

const mockWeaknesses: WeaknessWithLevel[] = [
  {
    area: "論拠となるデータ・事例の不足",
    count: 5,
    firstOccurred: new Date(),
    lastOccurred: new Date(),
    improving: false,
    resolved: false,
    source: "essay",
    reminderDismissedAt: null,
    level: "critical",
  },
  {
    area: "AP連動の弱さ",
    count: 3,
    firstOccurred: new Date(),
    lastOccurred: new Date(),
    improving: false,
    resolved: false,
    source: "essay",
    reminderDismissedAt: null,
    level: "warning",
  },
  {
    area: "導入部分の改善",
    count: 2,
    firstOccurred: new Date(),
    lastOccurred: new Date(),
    improving: true,
    resolved: false,
    source: "essay",
    reminderDismissedAt: null,
    level: "improving",
  },
];

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
        setWeaknesses(mockWeaknesses.slice(0, MAX_DISPLAY));
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
        {weaknesses.map((w) => (
          <div key={w.area} className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${levelBadgeClass[w.level]}`}
            >
              {levelLabel[w.level]}
            </Badge>
            <span className="text-sm text-yellow-900">{w.area}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
