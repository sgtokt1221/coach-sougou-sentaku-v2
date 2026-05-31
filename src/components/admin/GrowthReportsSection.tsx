"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { userProfile } = useAuth();
  // 生成は管理者専用。講師は閲覧のみ。
  const canGenerate = userProfile?.role !== "teacher";
  const [generating, setGenerating] = useState<"weekly" | "monthly" | null>(null);

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
        {canGenerate && (
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
        )}
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
            {canGenerate
              ? "まだレポートがありません。上のボタンから生成してください。"
              : "まだレポートがありません。"}
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border bg-card transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2 p-3">
                  <Link
                    href={`/admin/reports/${studentId}/${r.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.period === "weekly" ? "週次" : "月次"}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatDate(r.startDate)} - {formatDate(r.endDate)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {r.overallAssessment}
                    </p>
                    {r.sessionSummary && r.sessionSummary.totalCount > 0 && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        期間内授業 {r.sessionSummary.totalCount} 回
                        {r.sessionSummary.newWeaknessAreas.length > 0 &&
                          ` / 新発見弱点 ${r.sessionSummary.newWeaknessAreas.length}`}
                      </div>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.generatedAt)}
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="印刷 (新規タブで開く)"
                    >
                      <Link
                        href={`/admin/reports/${studentId}/${r.id}?print=1`}
                        target="_blank"
                      >
                        <Printer className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
