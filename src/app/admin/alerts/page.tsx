"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  Clock,
  Repeat,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthSWR } from "@/lib/api/swr";
import type { AlertItem } from "@/lib/types/admin";

type FilterType = "all" | "inactive" | "declining" | "repeated_weakness";

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "inactive", label: "非アクティブ" },
  { value: "declining", label: "スコア低下" },
  { value: "repeated_weakness", label: "弱点繰返し" },
];

function alertTypeConfig(type: AlertItem["type"]) {
  switch (type) {
    case "inactive":
      return { label: "非アクティブ", icon: Clock, color: "text-amber-600 dark:text-amber-400" };
    case "declining":
      return { label: "スコア低下", icon: TrendingDown, color: "text-rose-600 dark:text-rose-400" };
    case "repeated_weakness":
      return { label: "弱点繰返し", icon: Repeat, color: "text-orange-600 dark:text-orange-400" };
  }
}

export default function AdminAlertsPage() {
  const { data: fetchedAlerts, isLoading: loading } = useAuthSWR<AlertItem[]>("/api/admin/alerts");
  const [localAlerts, setLocalAlerts] = useState<AlertItem[] | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const alerts = localAlerts ?? fetchedAlerts ?? [];

  const filteredAlerts =
    filter === "all" ? alerts : alerts.filter((a) => a.type === filter);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && !a.acknowledged
  ).length;

  function toggleAcknowledged(id: string) {
    setLocalAlerts((prev) =>
      (prev ?? fetchedAlerts ?? []).map((a) =>
        a.id === id ? { ...a, acknowledged: !a.acknowledged } : a
      )
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="size-6" />
            アラート管理
          </h1>
          <p className="text-sm text-muted-foreground">
            要注意生徒のアラートを確認・管理できます
          </p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              緊急 {criticalCount}件
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm">
            未確認 {unacknowledgedCount}件
          </Badge>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({alerts.filter((a) => a.type === opt.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {filter === "all"
              ? "現在アラートはありません"
              : "該当するアラートはありません"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = alertTypeConfig(alert.type);
            const TypeIcon = config.icon;
            return (
              <Card
                key={alert.id}
                className={cn(
                  "transition-all",
                  alert.acknowledged && "opacity-60",
                  !alert.acknowledged &&
                    alert.severity === "critical" &&
                    "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                  !alert.acknowledged &&
                    alert.severity === "warning" &&
                    "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
                )}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                      alert.severity === "critical"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-yellow-100 dark:bg-yellow-900/30"
                    )}
                  >
                    <TypeIcon
                      className={cn("size-5", config.color)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {alert.severity === "critical" ? "緊急" : "注意"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      {alert.acknowledged && (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 dark:border-emerald-700 text-xs text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle className="mr-1 size-3" />
                          確認済み
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{alert.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      検出日時:{" "}
                      {new Date(alert.detectedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAcknowledged(alert.id)}
                    >
                      {alert.acknowledged ? "未確認に戻す" : "確認済みにする"}
                    </Button>
                    <Link href={`/admin/students/${alert.studentUid}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-1 size-3" />
                        詳細
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
