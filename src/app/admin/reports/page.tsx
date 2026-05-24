"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
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
  ExternalLink,
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

  // 担当生徒それぞれの最新 1 件を mount 時にロード (生徒詳細から個別生成したものもここに出る)
  const {
    data: latestReports,
    isLoading: loadingLatest,
    mutate: mutateLatest,
  } = useAuthSWR<GrowthReportSummary[]>("/api/admin/reports/latest");

  // 一括生成直後はその結果を優先表示。それ以外は API の最新一覧
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
      // SWR キャッシュも最新化 (バックグラウンドで再取得)
      mutateLatest();
    } catch (error) {
      console.error("Failed to generate reports:", error);
      toast.error(error instanceof Error ? error.message : "レポート生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }, [period, mutateLatest]);

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
        // 既存レポートの取得 (POST=generate にすると毎回新規生成されてしまうので GET にする)
        const res = await authFetch(
          `/api/admin/reports/${summary.studentId}/${summary.id}`,
          { method: "GET" }
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
      {generating || (loadingLatest && !reports) ? (
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
              まだレポートが 1 件もありません。生徒詳細ページから個別に生成するか、上の「一括生成」ボタンから作成してください。
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
                        {report.hasPracticeQuestions === false && (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                            title="類題は一括生成では作られません。展開して個別に生成してください。"
                          >
                            類題未生成
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {report.overallAssessment}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-5">
                      {/* Essay summary: 件数 + 先期比 */}
                      <div
                        className="min-w-[88px] rounded-md bg-muted/40 px-2.5 py-1.5 text-center"
                        title={`小論文: 今期 ${report.essayCount} 件、 先期比 ${report.essayScoreChange >= 0 ? "+" : ""}${report.essayScoreChange} 点`}
                      >
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <FileText className="size-3" />
                          小論文
                        </div>
                        {report.essayCount > 0 ? (
                          <div className="mt-0.5 flex items-center justify-center gap-1 text-sm font-medium">
                            <span className="tabular-nums">{report.essayCount}件</span>
                            <span className="text-muted-foreground">/</span>
                            <ScoreChangeIndicator
                              change={report.essayScoreChange}
                            />
                          </div>
                        ) : (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            未受験
                          </div>
                        )}
                      </div>

                      {/* Interview summary: 件数 + 先期比 */}
                      <div
                        className="min-w-[88px] rounded-md bg-muted/40 px-2.5 py-1.5 text-center"
                        title={`面接: 今期 ${report.interviewCount} 件、 先期比 ${report.interviewScoreChange >= 0 ? "+" : ""}${report.interviewScoreChange} 点`}
                      >
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <Mic className="size-3" />
                          面接
                        </div>
                        {report.interviewCount > 0 ? (
                          <div className="mt-0.5 flex items-center justify-center gap-1 text-sm font-medium">
                            <span className="tabular-nums">
                              {report.interviewCount}件
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <ScoreChangeIndicator
                              change={report.interviewScoreChange}
                            />
                          </div>
                        ) : (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            未受験
                          </div>
                        )}
                      </div>

                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="印刷 (新規タブで開く)"
                      >
                        <Link
                          href={`/admin/reports/${report.studentId}/${report.id}?print=1`}
                          target="_blank"
                        >
                          <Printer className="size-4" />
                        </Link>
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
                        <>
                          <div className="mb-3 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/admin/reports/${report.studentId}/${report.id}`}
                              >
                                <ExternalLink className="mr-1.5 size-3.5" />
                                詳細を開く
                              </Link>
                            </Button>
                          </div>
                          <ReportDetailCard report={detail} />
                        </>
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
