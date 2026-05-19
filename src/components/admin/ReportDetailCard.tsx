"use client";

import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Mic,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * スコアの増減を矢印付きで表示する小コンポーネント。
 * 一覧行と詳細カードの両方で利用される。
 */
export function ScoreChangeIndicator({ change }: { change: number }) {
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

/**
 * 弱点の改善状況バッジ。
 */
export function WeaknessStatusBadge({
  status,
}: {
  status: "improved" | "stable" | "declined";
}) {
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

/**
 * 成長レポート 1 件分の詳細カード。
 *
 * /admin/reports 一覧の展開、/admin/students/[id] の GrowthReportsSection、
 * /admin/reports/print (PDF 出力) で共通して利用される。
 */
export function ReportDetailCard({ report }: { report: GrowthReport }) {
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
