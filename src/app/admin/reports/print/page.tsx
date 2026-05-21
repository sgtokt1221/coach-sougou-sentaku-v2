"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { ReportDetailCard } from "@/components/admin/ReportDetailCard";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * 成長レポートの印刷専用ページ。
 *
 * URL: `/admin/reports/print?studentId=xxx&reportId=yyy`
 *
 * - 描画完了後に自動で `window.print()` を呼び出す
 * - 「PDF として保存」を選択することで PDF 出力可能
 * - 操作用ボタンは `print:hidden` で印刷物には含めない
 * - A4 縦・余白 15mm 固定
 */
export default function ReportPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <PrintBody />
    </Suspense>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function PrintBody() {
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";
  const reportId = params.get("reportId") ?? "";

  // period 不問で十分な件数を取得し、reportId で絞る
  const swrKey = studentId
    ? `/api/admin/reports/${studentId}?limit=100`
    : null;
  const { data: reports, error, isLoading } = useAuthSWR<GrowthReport[]>(swrKey);

  const report = useMemo(() => {
    if (!Array.isArray(reports)) return null;
    return reports.find((r) => r.id === reportId) ?? null;
  }, [reports, reportId]);

  // データロード完了後に印刷ダイアログを自動起動
  useEffect(() => {
    if (report) {
      // フォントロード後に印刷を発火させるため次フレームへずらす
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [report]);

  if (!studentId || !reportId) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
        URL に studentId と reportId が必要です。
      </div>
    );
  }

  if (isLoading || !reports) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
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
      {/* A4 縦・余白固定 (印刷時のみ効く) + admin chrome を非表示にする */}
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
          /* admin の sidebar / bottom nav 等を印刷対象から除外 */
          body * {
            visibility: hidden;
          }
          .print-root,
          .print-root * {
            visibility: visible;
          }
          .print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* カード単位でページまたぎを避ける */
          .print-root .rounded-lg,
          .print-root .rounded-md,
          .print-root section,
          .print-root header {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* details を強制展開 (ブラウザ依存しない確実な展開) */
          .print-root details {
            display: block !important;
          }
          .print-root details > summary {
            display: none !important;
          }
          .print-root details > *:not(summary) {
            display: block !important;
          }
        }
      `}</style>

      <div className="print-root mx-auto max-w-3xl bg-white p-6 text-foreground print:p-0">
        {/* ヘッダー */}
        <header className="mb-4 border-b pb-3">
          <h1 className="text-xl font-bold">
            {report.period === "weekly" ? "週次" : "月次"}成長レポート
          </h1>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">生徒名: </span>
              <span className="font-medium">{report.studentName} さん</span>
            </div>
            <div>
              <span className="text-muted-foreground">期間: </span>
              <span className="font-medium">
                {formatDate(report.startDate)} 〜 {formatDate(report.endDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">生成日: </span>
              <span className="font-medium">{formatDate(report.generatedAt)}</span>
            </div>
          </div>
        </header>

        {/* 詳細カード — 印刷物に編集ツールバーを出さないため readOnly */}
        <main>
          <ReportDetailCard report={report} readOnly />
        </main>

        {/* 操作ボタン (印刷時は非表示) */}
        <div className="mt-6 flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            もう一度印刷
          </Button>
          <Button variant="ghost" onClick={() => window.close()}>
            閉じる
          </Button>
        </div>
      </div>
    </>
  );
}
