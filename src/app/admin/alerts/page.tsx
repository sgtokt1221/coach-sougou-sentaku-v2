"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  TrendingDown,
  Clock,
  Repeat,
  CheckCircle,
  ExternalLink,
  FileWarning,
  Target,
  Lock,
  CalendarClock,
  Activity,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthSWR } from "@/lib/api/swr";
import type { AlertItem } from "@/lib/types/admin";

type FilterType =
  | "all"
  | "inactive"
  | "declining"
  | "repeated_weakness"
  | "document_deadline"
  | "ap_struggle"
  | "weakness_stuck"
  | "deadline_risk"
  | "score_plateau";

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "document_deadline", label: "書類期限" },
  { value: "inactive", label: "非アクティブ" },
  { value: "declining", label: "スコア低下" },
  { value: "repeated_weakness", label: "弱点繰返し" },
  { value: "ap_struggle", label: "AP不適合" },
  { value: "weakness_stuck", label: "弱点停滞" },
  { value: "deadline_risk", label: "期限リスク" },
  { value: "score_plateau", label: "成長停滞" },
];

function alertTypeConfig(type: AlertItem["type"]) {
  switch (type) {
    case "inactive":
      return { label: "非アクティブ", icon: Clock, color: "text-amber-600 dark:text-amber-400" };
    case "declining":
      return { label: "スコア低下", icon: TrendingDown, color: "text-rose-600 dark:text-rose-400" };
    case "repeated_weakness":
      return { label: "弱点繰返し", icon: Repeat, color: "text-orange-600 dark:text-orange-400" };
    case "document_deadline":
      return { label: "書類期限", icon: FileWarning, color: "text-purple-600 dark:text-purple-400" };
    case "ap_struggle":
      return { label: "AP不適合", icon: Target, color: "text-red-600 dark:text-red-400" };
    case "weakness_stuck":
      return { label: "弱点停滞", icon: Lock, color: "text-yellow-600 dark:text-yellow-400" };
    case "deadline_risk":
      return { label: "期限リスク", icon: CalendarClock, color: "text-indigo-600 dark:text-indigo-400" };
    case "score_plateau":
      return { label: "成長停滞", icon: Activity, color: "text-cyan-600 dark:text-cyan-400" };
  }
}

function severityBgClass(severity: AlertItem["severity"], acknowledged: boolean) {
  if (acknowledged) return "";
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20";
    case "high":
      return "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20";
    case "warning":
      return "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20";
  }
}

function severityIconBgClass(severity: AlertItem["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-100 dark:bg-red-900/30";
    case "high":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "warning":
      return "bg-yellow-100 dark:bg-yellow-900/30";
  }
}

function severityLabel(severity: AlertItem["severity"]) {
  switch (severity) {
    case "critical":
      return "緊急";
    case "high":
      return "重要";
    case "warning":
      return "注意";
  }
}

function severityBadgeVariant(severity: AlertItem["severity"]): "destructive" | "secondary" {
  return severity === "critical" || severity === "high" ? "destructive" : "secondary";
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
    (a) => (a.severity === "critical" || a.severity === "high") && !a.acknowledged
  ).length;
  const deadlineCount = alerts.filter(
    (a) => a.type === "document_deadline" && !a.acknowledged
  ).length;
  const predictiveCount = alerts.filter(
    (a) =>
      ["ap_struggle", "weakness_stuck", "deadline_risk", "score_plateau"].includes(a.type) &&
      !a.acknowledged
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
        <div className="flex flex-wrap items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              緊急 {criticalCount}件
            </Badge>
          )}
          {deadlineCount > 0 && (
            <Badge variant="outline" className="border-purple-300 text-sm text-purple-600 dark:border-purple-700 dark:text-purple-400">
              書類期限 {deadlineCount}件
            </Badge>
          )}
          {predictiveCount > 0 && (
            <Badge variant="outline" className="border-cyan-300 text-sm text-cyan-600 dark:border-cyan-700 dark:text-cyan-400">
              予測 {predictiveCount}件
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm">
            未確認 {unacknowledgedCount}件
          </Badge>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const count = alerts.filter((a) => a.type === opt.value).length;
          return (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              {opt.value !== "all" && (
                <span className="ml-1 text-xs opacity-70">
                  ({count})
                </span>
              )}
            </Button>
          );
        })}
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
                  !alert.acknowledged && severityBgClass(alert.severity, alert.acknowledged)
                )}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                      severityIconBgClass(alert.severity)
                    )}
                  >
                    <TypeIcon
                      className={cn("size-5", config.color)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={severityBadgeVariant(alert.severity)}
                        className="text-xs"
                      >
                        {severityLabel(alert.severity)}
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

                    {/* Recommended Action */}
                    {alert.recommendedAction && !alert.acknowledged && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-blue-50/60 dark:bg-blue-950/20 px-2.5 py-1.5">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          {alert.recommendedAction}
                        </p>
                      </div>
                    )}

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
