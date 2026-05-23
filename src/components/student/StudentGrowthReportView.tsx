"use client";

import Link from "next/link";
import {
  Lightbulb,
  MessageSquare,
  Minus,
  Pencil,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthReport } from "@/lib/types/growth-report";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 生徒向けの成長レポート簡素化ビュー。
 *
 * `ReportDetailCard` (admin/teacher 編集 UI 前提) ではなく、生徒に必要な
 * 重要 3 要素 (総評・推奨アクション・講師コメント) に絞って表示する。
 *
 * 含めるもの: 期間バッジ / 学力サマリー (2 カラム) / overallAssessment /
 *           teacherComment (あれば) / recommendations / 類題誘導
 * 含めないもの: 弱点進捗 (別タブで表示) / 類題リスト本体 (宿題タブで管理)
 */
export function StudentGrowthReportView({ report }: { report: GrowthReport }) {
  return (
    <div className="space-y-4">
      {/* 期間バッジ + 種別 */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">
          {report.period === "weekly" ? "週次" : "月次"}
        </Badge>
        <span>
          期間: {formatDate(report.startDate)} 〜 {formatDate(report.endDate)}
        </span>
        <span className="ml-auto">生成: {formatDate(report.generatedAt)}</span>
      </div>

      {/* 学力サマリー (2 カラム) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreCard label="小論文" stats={report.essayStats} max={50} />
        <ScoreCard label="面接" stats={report.interviewStats} max={40} />
      </div>

      {/* 先生からのメッセージ (overallAssessment) */}
      {report.overallAssessment && (
        <Card className="border-teal-200 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <MessageSquare className="size-4 text-teal-700 dark:text-teal-300" />
              先生からのメッセージ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.overallAssessment}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 講師コメント (任意) */}
      {report.teacherComment && (
        <Card className="border-purple-200 bg-purple-50/40 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Pencil className="size-4 text-purple-700 dark:text-purple-300" />
              講師から
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.teacherComment}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 推奨アクション */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Lightbulb className="size-4 text-amber-600" />
              次に取り組むこと
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 類題が配布されているなら宿題タブへ誘導 */}
      {(report.practiceQuestions?.length ?? 0) > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-emerald-600" />
              {report.practiceQuestions!.length} 件の練習問題が用意されています
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/student/homework">宿題を見る</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  stats,
  max,
}: {
  label: string;
  stats: GrowthReport["essayStats"] | GrowthReport["interviewStats"];
  max: number;
}) {
  if (!stats || stats.count === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          {label}: 今期間の記録なし
        </CardContent>
      </Card>
    );
  }
  const change = stats.scoreChange ?? 0;
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{stats.avgScore}</span>
          <span className="text-xs text-muted-foreground">/ {max}</span>
          <span
            className={`ml-auto inline-flex items-center gap-0.5 text-xs ${
              change > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : change < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="size-3" />
            ) : change < 0 ? (
              <TrendingDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {change > 0 ? `+${change}` : change}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">{stats.count} 件</div>
      </CardContent>
    </Card>
  );
}
