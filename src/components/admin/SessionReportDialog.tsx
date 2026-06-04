"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { FileBarChart, Loader2, Printer, FileText, Sparkles } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { ReportDetailCard } from "@/components/admin/ReportDetailCard";
import type { GrowthReport } from "@/lib/types/growth-report";

type Period = "weekly" | "monthly";

/**
 * セッション画面内で成長レポートを生成・閲覧・類題作成・印刷するダイアログ。
 * 週次/月次を切り替え、該当期間の最新レポートを表示。無ければその場で生成できる。
 * ReportDetailCard を編集可(readOnly=false)で出すため、類題生成・宿題配布・総評編集が機能する。
 * 印刷は新規タブで開くため、録音中でもセッション画面は保持される。
 */
export function SessionReportDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await authFetch(
        `/api/admin/reports/${studentId}?period=${period}&limit=1`,
      );
      if (!res.ok) throw new Error();
      const list = (await res.json()) as GrowthReport[];
      setReport(Array.isArray(list) && list.length > 0 ? list[0] : null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, period]);

  useEffect(() => {
    if (!open) return;
    fetchLatest();
  }, [open, fetchLatest]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`/api/admin/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, period }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "生成に失敗しました");
      }
      const generated = (await res.json()) as GrowthReport;
      setReport(generated);
      toast.success(`${period === "weekly" ? "週次" : "月次"}レポートを生成しました`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "レポート生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const periodLabel = period === "weekly" ? "週次" : "月次";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="size-5" />
            成長レポート
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentControl<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { id: "weekly", label: "週次" },
                { id: "monthly", label: "月次" },
              ]}
              size="sm"
            />
            {report && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/admin/reports/${studentId}/${report.id}?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Printer className="mr-1 size-3.5" />
                    レポート印刷
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/admin/reports/${studentId}/${report.id}/practice-sheet?mode=both`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="mr-1 size-3.5" />
                    問題用紙
                  </a>
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : report ? (
            <ReportDetailCard
              report={report}
              readOnly={false}
              hideMetaHeader
              onUpdated={setReport}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {periodLabel}レポートはまだありません
              </p>
              <Button onClick={generate} disabled={generating} className="cursor-pointer">
                {generating ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 size-4" />
                )}
                {periodLabel}レポートを生成
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
