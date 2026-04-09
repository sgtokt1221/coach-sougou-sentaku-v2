"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileBarChart,
  Play,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Mic,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { GrowthReportSummary, GrowthReport } from "@/lib/types/growth-report";

function ScoreChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3.5" />
        +{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
        <TrendingDown className="size-3.5" />
        {change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Minus className="size-3.5" />
      0
    </span>
  );
}

function WeaknessStatusBadge({ status }: { status: "improved" | "stable" | "declined" }) {
  switch (status) {
    case "improved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="mr-1 size-3" />
          改善
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 size-3" />
          悪化
        </Badge>
      );
    case "stable":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 size-3" />
          横ばい
        </Badge>
      );
  }
}

function ReportDetailCard({ report }: { report: GrowthReport }) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      {/* Essay Stats */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4" />
          小論文（{report.essayStats.count}件）
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-bold">{report.essayStats.avgScore}</p>
            <p className="text-[11px] text-muted-foreground">平均スコア</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-bold">
              <ScoreChangeIndicator change={report.essayStats.scoreChange} />
            </p>
            <p className="text-[11px] text-muted-foreground">スコア変動</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {report.essayStats.bestCategory}
            </p>
            <p className="text-[11px] text-muted-foreground">得意分野</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {report.essayStats.worstCategory}
            </p>
            <p className="text-[11px] text-muted-foreground">要強化</p>
          </div>
        </div>
      </div>

      {/* Interview Stats */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Mic className="size-4" />
          面接（{report.interviewStats.count}件）
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-bold">{report.interviewStats.avgScore}</p>
            <p className="text-[11px] text-muted-foreground">平均スコア</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-bold">
              <ScoreChangeIndicator change={report.interviewStats.scoreChange} />
            </p>
            <p className="text-[11px] text-muted-foreground">スコア変動</p>
          </div>
        </div>
      </div>

      {/* Weakness Progress */}
      {report.weaknessProgress.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">弱点の推移</h4>
          <div className="space-y-2">
            {report.weaknessProgress.map((w) => (
              <div
                key={w.weakness}
                className="flex items-center justify-between rounded-md bg-background p-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{w.weakness}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.previousScore} → {w.currentScore}（{w.attempts}回指摘）
                  </p>
                </div>
                <WeaknessStatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">推奨アクション</h4>
          <ul className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-primary">-</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Assessment */}
      <div className="rounded-md border bg-background p-3">
        <p className="text-sm font-semibold mb-1">総合評価</p>
        <p className="text-sm text-muted-foreground">{report.overallAssessment}</p>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<GrowthReportSummary[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<string, GrowthReport>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  // Load latest batch reports on mount
  const { data: latestReports } =
    useAuthSWR<GrowthReportSummary[]>(null); // We don't auto-load; only on generate

  const displayReports = reports ?? latestReports ?? [];

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await authFetch("/api/admin/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const data: GrowthReportSummary[] = await res.json();
        setReports(data);
        setExpandedId(null);
        setExpandedReports({});
      }
    } catch (error) {
      console.error("Failed to generate reports:", error);
    } finally {
      setGenerating(false);
    }
  }, [period]);

  const handleExpand = useCallback(
    async (summary: GrowthReportSummary) => {
      if (expandedId === summary.id) {
        setExpandedId(null);
        return;
      }

      setExpandedId(summary.id);

      // If we already have the detail, don't re-fetch
      if (expandedReports[summary.id]) return;

      setLoadingDetail(summary.id);
      try {
        const res = await authFetch(
          `/api/admin/reports/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: summary.studentId,
              period: summary.period,
            }),
          }
        );
        if (res.ok) {
          const detail: GrowthReport = await res.json();
          setExpandedReports((prev) => ({ ...prev, [summary.id]: detail }));
        }
      } catch (error) {
        console.error("Failed to fetch report detail:", error);
      } finally {
        setLoadingDetail(null);
      }
    },
    [expandedId, expandedReports]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileBarChart className="size-6" />
            レポート生成
          </h1>
          <p className="text-sm text-muted-foreground">
            生徒の成長レポートを生成・確認できます
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Toggle */}
          <div className="flex rounded-lg border">
            <Button
              variant={period === "weekly" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setPeriod("weekly")}
            >
              週次
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setPeriod("monthly")}
            >
              月次
            </Button>
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Play className="mr-2 size-4" />
                一括生成
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {displayReports.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{displayReports.length}</p>
              <p className="text-xs text-muted-foreground">レポート数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">
                {displayReports.reduce((sum, r) => sum + r.essayCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">小論文合計</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">
                {displayReports.reduce((sum, r) => sum + r.interviewCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">面接合計</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {displayReports.filter((r) => r.essayScoreChange > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">スコア上昇</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports List */}
      {generating ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : displayReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBarChart className="mx-auto mb-4 size-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              レポートがまだ生成されていません。「一括生成」ボタンをクリックして生成してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayReports.map((report) => {
            const isExpanded = expandedId === report.id;
            const detail = expandedReports[report.id];
            const isLoadingThis = loadingDetail === report.id;

            return (
              <Card key={report.id} className="transition-all">
                <CardContent className="p-0">
                  {/* Summary Row */}
                  <button
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50"
                    onClick={() => handleExpand(report)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium">{report.studentName}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {report.period === "weekly" ? "週次" : "月次"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {report.overallAssessment}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-6">
                      {/* Essay score change */}
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <FileText className="size-3.5 text-muted-foreground" />
                          <ScoreChangeIndicator change={report.essayScoreChange} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {report.essayCount}件
                        </p>
                      </div>

                      {/* Interview score change */}
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Mic className="size-3.5 text-muted-foreground" />
                          <ScoreChangeIndicator change={report.interviewScoreChange} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {report.interviewCount}件
                        </p>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3">
                      {isLoadingThis ? (
                        <div className="space-y-3 py-4">
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : detail ? (
                        <ReportDetailCard report={detail} />
                      ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          詳細の読み込みに失敗しました
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
