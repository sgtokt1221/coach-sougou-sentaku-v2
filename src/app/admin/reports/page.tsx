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
  FileText,
  Mic,
  Loader2,
  Printer,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { GrowthReportSummary, GrowthReport } from "@/lib/types/growth-report";
import {
  ReportDetailCard,
  ScoreChangeIndicator,
} from "@/components/admin/ReportDetailCard";

/**
 * 5xx レスポンスから {error, detail, step} を取り出して人間向け文字列にする。
 */
async function readApiError(res: Response): Promise<string> {
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    step?: string;
  };
  if (payload.detail) {
    return `[${payload.step ?? "?"}] ${payload.detail}`;
  }
  return payload.error ?? `HTTP ${res.status}`;
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
      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }
      const data: GrowthReportSummary[] = await res.json();
      setReports(data);
      setExpandedId(null);
      setExpandedReports({});
    } catch (error) {
      console.error("Failed to generate reports:", error);
      toast.error(error instanceof Error ? error.message : "レポート生成に失敗しました");
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
        if (!res.ok) {
          const msg = await readApiError(res);
          throw new Error(msg);
        }
        const detail: GrowthReport = await res.json();
        setExpandedReports((prev) => ({ ...prev, [summary.id]: detail }));
      } catch (error) {
        console.error("Failed to fetch report detail:", error);
        toast.error(error instanceof Error ? error.message : "レポート取得に失敗しました");
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
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50"
                    onClick={() => handleExpand(report)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleExpand(report);
                      }
                    }}
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

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `/admin/reports/print?studentId=${report.studentId}&reportId=${report.id}`,
                            "_blank",
                          );
                        }}
                        aria-label="PDF として保存"
                      >
                        <Printer className="size-4" />
                      </Button>

                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

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
