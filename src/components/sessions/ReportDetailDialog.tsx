"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { ReportDetailCard } from "@/components/admin/ReportDetailCard";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * セッション画面内で成長レポートを読み取り表示するダイアログ。
 * 既存の ReportDetailCard を readOnly で埋め込む（ページ遷移しないため録音を止めない）。
 */
export default function ReportDetailDialog({
  studentId,
  reportId,
  open,
  onOpenChange,
}: {
  studentId: string;
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reportId) return;
    let active = true;
    setLoading(true);
    setData(null);
    authFetch(`/api/admin/reports/${studentId}/${reportId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, reportId, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="size-5" />
            成長レポート
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データの取得に失敗しました
          </p>
        ) : (
          <ReportDetailCard report={data} readOnly />
        )}
      </DialogContent>
    </Dialog>
  );
}
