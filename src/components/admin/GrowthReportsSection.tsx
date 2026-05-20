"use client";

import { useState } from "react";
import { TrendingUp, Loader2, Sparkles, Printer } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { GrowthReport } from "@/lib/types/growth-report";

interface Props {
  studentId: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("ja-JP");
  } catch {
    return "-";
  }
}

export function GrowthReportsSection({ studentId }: Props) {
  // API は GrowthReport[] を直接返すため、ラップせず配列で受ける
  const { data, isLoading, mutate, error } = useAuthSWR<GrowthReport[]>(
    `/api/admin/reports/${studentId}?limit=10`,
  );
  const reports = data ?? [];
  const [generating, setGenerating] = useState<"weekly" | "monthly" | null>(null);
  const [open, setOpen] = useState<GrowthReport | null>(null);

  const generate = async (period: "weekly" | "monthly") => {
    console.log("[GrowthReports] generate() start", { period, studentId });
    setGenerating(period);
    try {
      console.log("[GrowthReports] calling authFetch");
      const res = await authFetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, period }),
      });
      console.log("[GrowthReports] response received", { status: res.status, ok: res.ok });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          step?: string;
        };
        const msg = payload.detail
          ? `[${payload.step ?? "?"}] ${payload.detail}`
          : payload.error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      await mutate();
      console.log("[GrowthReports] success, mutate done");
      toast.success(`${period === "weekly" ? "週次" : "月次"}レポートを生成しました`);
    } catch (err) {
      console.error("[GrowthReports] caught error:", err);
      toast.error(err instanceof Error ? err.message : "レポート生成に失敗しました");
    } finally {
      setGenerating(null);
      console.log("[GrowthReports] generate() finally");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4" />
          成長レポート
          {reports.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {reports.length} 件
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generate("weekly")}
            disabled={generating !== null}
            className="cursor-pointer"
          >
            {generating === "weekly" ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3" />
            )}
            週次生成
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generate("monthly")}
            disabled={generating !== null}
            className="cursor-pointer"
          >
            {generating === "monthly" ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3" />
            )}
            月次生成
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <ApiErrorBanner error={error} title="成長レポート一覧の取得に失敗しました" />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだレポートがありません。上のボタンから生成してください。
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpen(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(r);
                  }
                }}
                className="w-full cursor-pointer text-left rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.period === "weekly" ? "週次" : "月次"}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatDate(r.startDate)} - {formatDate(r.endDate)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {r.overallAssessment}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.generatedAt)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/admin/reports/print?studentId=${studentId}&reportId=${r.id}`,
                          "_blank",
                        );
                      }}
                      aria-label="PDF として保存"
                    >
                      <Printer className="size-4" />
                    </Button>
                  </div>
                </div>
                {r.sessionSummary && r.sessionSummary.totalCount > 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    期間内授業 {r.sessionSummary.totalCount} 回
                    {r.sessionSummary.newWeaknessAreas.length > 0 &&
                      ` / 新発見弱点 ${r.sessionSummary.newWeaknessAreas.length}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {open.period === "weekly" ? "週次" : "月次"} レポート
                </DialogTitle>
                <DialogDescription>
                  {formatDate(open.startDate)} - {formatDate(open.endDate)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    総合評価
                  </div>
                  <p className="whitespace-pre-wrap">{open.overallAssessment}</p>
                </div>
                {open.sessionSummary && open.sessionSummary.totalCount > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="text-xs font-medium">授業サマリー</div>
                    <div className="text-xs">
                      期間内 {open.sessionSummary.totalCount} 回実施
                    </div>
                    {open.sessionSummary.mainTopics.length > 0 && (
                      <div>
                        <div className="text-[11px] text-muted-foreground">扱ったテーマ</div>
                        <ul className="list-disc list-inside text-xs">
                          {open.sessionSummary.mainTopics.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {open.sessionSummary.teacherObservations.length > 0 && (
                      <div>
                        <div className="text-[11px] text-muted-foreground">講師の観察</div>
                        <ul className="list-disc list-inside text-xs">
                          {open.sessionSummary.teacherObservations.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {open.sessionSummary.newWeaknessAreas.length > 0 && (
                      <div>
                        <div className="text-[11px] text-muted-foreground">授業で新発見の弱点</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {open.sessionSummary.newWeaknessAreas.map((a) => (
                            <Badge
                              key={a}
                              variant="outline"
                              className="text-[10px] border-rose-200 bg-rose-50 text-rose-700"
                            >
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {open.sessionSummary.latestNextAgenda && (
                      <div>
                        <div className="text-[11px] text-muted-foreground">次回に向けて</div>
                        <p className="text-xs">{open.sessionSummary.latestNextAgenda}</p>
                      </div>
                    )}
                  </div>
                )}
                {open.recommendations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      推奨アクション
                    </div>
                    <ul className="list-disc list-inside text-xs">
                      {open.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
