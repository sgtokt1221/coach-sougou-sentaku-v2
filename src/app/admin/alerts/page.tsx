"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FileText,
  FileCheck,
  Sparkles,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { AlertItem } from "@/lib/types/admin";
import { MarkAllViewedButton } from "@/components/admin/UnviewedSubmissions";

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

/**
 * 通知タイプごとの表示設定（ラベル・アイコン・アイコン色）を返す。
 * 未知のタイプでも既定値を返すため、戻り値が undefined になることはない。
 * @param type 通知タイプ
 * @returns ラベル・アイコン・色を含む表示設定
 */
function alertTypeConfig(type: AlertItem["type"]) {
  switch (type) {
    case "inactive":
      return { label: "非アクティブ", icon: Clock, color: "text-amber-600 dark:text-amber-400" };
    case "declining":
      return { label: "スコア低下", icon: TrendingDown, color: "text-rose-600 dark:text-rose-400" };
    case "repeated_weakness":
      return { label: "弱点繰返し", icon: Repeat, color: "text-amber-600 dark:text-amber-400" };
    case "document_deadline":
      return { label: "書類期限", icon: FileWarning, color: "text-purple-600 dark:text-purple-400" };
    case "ap_struggle":
      return { label: "AP不適合", icon: Target, color: "text-rose-600 dark:text-rose-400" };
    case "weakness_stuck":
      return { label: "弱点停滞", icon: Lock, color: "text-amber-600 dark:text-amber-400" };
    case "deadline_risk":
      return { label: "期限リスク", icon: CalendarClock, color: "text-indigo-600 dark:text-indigo-400" };
    case "score_plateau":
      return { label: "成長停滞", icon: Activity, color: "text-cyan-600 dark:text-cyan-400" };
    // 活動系（お知らせ）タイプ — 控えめな青系
    case "essay_reviewed":
      return { label: "添削提出", icon: FileText, color: "text-sky-600 dark:text-sky-400" };
    case "self_analysis_done":
      return { label: "自己分析更新", icon: Sparkles, color: "text-sky-600 dark:text-sky-400" };
    case "document_submitted":
      return { label: "書類提出", icon: FileCheck, color: "text-sky-600 dark:text-sky-400" };
    case "interview_done":
      return { label: "模擬面接", icon: Mic, color: "text-sky-600 dark:text-sky-400" };
    case "skill_check_done":
      return { label: "スキルチェック", icon: CheckCircle, color: "text-sky-600 dark:text-sky-400" };
    default:
      // 想定外のタイプでも undefined を返さず、控えめな既定表示にフォールバック。
      return { label: "通知", icon: Bell, color: "text-slate-600 dark:text-slate-400" };
  }
}

function severityBgClass(severity: AlertItem["severity"], acknowledged: boolean) {
  if (acknowledged) return "";
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20";
    case "high":
      return "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20";
    case "warning":
      return "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20";
    case "info":
      return "border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/20";
  }
}

function severityIconBgClass(severity: AlertItem["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-rose-100 dark:bg-rose-900/30";
    case "high":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "warning":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "info":
      return "bg-sky-100 dark:bg-sky-900/30";
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
    case "info":
      return "お知らせ";
  }
}

function severityBadgeVariant(severity: AlertItem["severity"]): "destructive" | "secondary" {
  return severity === "critical" || severity === "high" ? "destructive" : "secondary";
}

export default function AdminAlertsPage() {
  const router = useRouter();
  const { data: fetchedAlerts, isLoading: loading, error: alertsError } = useAuthSWR<AlertItem[]>("/api/admin/alerts");
  const [localAlerts, setLocalAlerts] = useState<AlertItem[] | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  /** 確認済みだけを見るモード。既定は未確認だけを出す */
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const alerts = localAlerts ?? fetchedAlerts ?? [];

  /**
   * 確認済みは一覧から外す。確認しても残り続けると、何が未対応なのかを
   * 毎回目で選り分けることになる。「確認済み N件」から表示に切り替えられる
   * ので、間違えて確認済みにしても戻せる。
   */
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);
  const visibleAlerts = showAcknowledged
    ? acknowledgedAlerts
    : alerts.filter((a) => !a.acknowledged);

  const filteredAlerts =
    filter === "all"
      ? visibleAlerts
      : visibleAlerts.filter((a) => a.type === filter);

  // severity で「要注意」(critical/high/warning) と「お知らせ」(info) に区分。
  // route 側で既にソート済みのため、filter で分割して順に描画する。
  const warningAlerts = filteredAlerts.filter((a) => a.severity !== "info");
  const infoAlerts = filteredAlerts.filter((a) => a.severity === "info");

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

  // 確認状態をサーバへ永続化。alert.id（=安定キー）は生徒間で重複しうるため
  // studentUid と id の両方で対象を突合する。楽観更新→失敗時ロールバック。
  async function toggleAcknowledged(alert: AlertItem) {
    const next = !alert.acknowledged;
    const flip = (value: boolean) =>
      setLocalAlerts((prev) =>
        (prev ?? fetchedAlerts ?? []).map((a) =>
          a.id === alert.id && a.studentUid === alert.studentUid
            ? { ...a, acknowledged: value }
            : a
        )
      );
    flip(next);
    try {
      const res = await authFetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUid: alert.studentUid,
          alertKey: alert.id,
          acknowledged: next,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      flip(alert.acknowledged); // ロールバック
      toast.error("確認状態の保存に失敗しました");
    }
  }

  /**
   * 通知カードを1件描画する。alert.link があればカード全体をクリックで遷移可能にする。
   * 確認トグル・詳細リンクはカード遷移と競合しないよう伝播を止める。
   * @param alert 描画対象の通知
   * @returns 通知カードの JSX
   */
  function renderAlert(alert: AlertItem) {
    const config = alertTypeConfig(alert.type);
    const TypeIcon = config.icon;
    const hasLink = Boolean(alert.link);
    return (
      <Card
        key={`${alert.studentUid}:${alert.id}`}
        role={hasLink ? "link" : undefined}
        tabIndex={hasLink ? 0 : undefined}
        onClick={hasLink ? () => router.push(alert.link!) : undefined}
        className={cn(
          "transition-all",
          hasLink && "cursor-pointer hover:shadow-sm",
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
            <TypeIcon className={cn("size-5", config.color)} />
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
            <p className="text-sm text-muted-foreground">{alert.message}</p>

            {/* Recommended Action */}
            {alert.recommendedAction && !alert.acknowledged && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-sky-50/60 dark:bg-sky-950/20 px-2.5 py-1.5">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
                <p className="text-xs text-sky-700 dark:text-sky-400">
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
              onClick={(e) => {
                // カードのリンク遷移と競合させない
                e.stopPropagation();
                toggleAcknowledged(alert);
              }}
            >
              {alert.acknowledged ? "未確認に戻す" : "確認済みにする"}
            </Button>
            <Link
              href={`/admin/students/${alert.studentUid}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-1 size-3" />
                詳細
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="size-6" />
            通知
          </h1>
          <p className="text-sm text-muted-foreground">
            生徒の状況と活動の通知を確認できます
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MarkAllViewedButton />
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
          {acknowledgedAlerts.length > 0 && (
            <Button
              variant={showAcknowledged ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAcknowledged((v) => !v)}
            >
              <CheckCircle className="mr-1 size-3.5" />
              確認済み {acknowledgedAlerts.length}件
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const count = visibleAlerts.filter((a) => a.type === opt.value).length;
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

      {alertsError && (
        <ApiErrorBanner error={alertsError} title="通知の取得に失敗しました" />
      )}

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {showAcknowledged
              ? "確認済みの通知はありません"
              : filter === "all"
                ? "未確認の通知はありません"
                : "該当する通知はありません"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 要注意 */}
          {warningAlerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                要注意
              </h2>
              {warningAlerts.map((alert) => renderAlert(alert))}
            </div>
          )}

          {/* お知らせ */}
          {infoAlerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                お知らせ
              </h2>
              {infoAlerts.map((alert) => renderAlert(alert))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
