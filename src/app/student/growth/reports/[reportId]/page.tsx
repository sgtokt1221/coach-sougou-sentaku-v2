"use client";

import { useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { ReportDetailCard } from "@/components/admin/ReportDetailCard";
import type { GrowthReport } from "@/lib/types/growth-report";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 生徒向け 成長レポート詳細画面 (readOnly)。
 *
 * URL: `/student/growth/reports/[reportId]`
 * クエリ: `?print=1` で自動印刷。
 */
export default function StudentReportDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          レポートを読み込んでいます...
        </div>
      }
    >
      <Body />
    </Suspense>
  );
}

function Body() {
  const router = useRouter();
  const params = useParams<{ reportId: string }>();
  const search = useSearchParams();
  const reportId = params?.reportId ?? "";
  const autoPrint = search.get("print") === "1";

  const { data: report, error, isLoading } = useAuthSWR<GrowthReport>(
    reportId ? `/api/student/reports/${reportId}` : null,
  );

  const printedRef = useRef(false);
  useEffect(() => {
    if (autoPrint && report && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, report]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        レポートを読み込んでいます...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-destructive">
        レポートが見つかりませんでした。
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          [data-app-chrome] {
            display: none !important;
          }
          /* AppLayout の h-dvh + overflow-hidden を印刷時に解除し全ページ出力を可能にする */
          [data-app-layout],
          [data-app-scroll] {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          main {
            overflow: visible !important;
            height: auto !important;
            padding-bottom: 0 !important;
          }
          details {
            display: block !important;
          }
          details > summary {
            display: none !important;
          }
          details > *:not(summary) {
            display: block !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8 print:p-0">
        <header className="rounded-lg border bg-card p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                aria-label="戻る"
                className="print:hidden"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold lg:text-xl">
                  {report.period === "weekly" ? "週次" : "月次"}成長レポート
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {report.period === "weekly" ? "週次" : "月次"}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {formatDate(report.startDate)} 〜 {formatDate(report.endDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    生成日: {formatDate(report.generatedAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 size-4" />
                印刷
              </Button>
            </div>
          </div>
        </header>

        <main>
          <ReportDetailCard report={report} readOnly hideMetaHeader />
        </main>
      </div>
    </>
  );
}
