"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { DetailedScoresTrendChart } from "@/components/growth/DetailedScoresTrendChart";
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle2, BarChart3, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";
import type { GrowthReport } from "@/lib/types/analytics";
import { useAuthSWR } from "@/lib/api/swr";
import { WeaknessSourceBadge, sourceLeftBorder } from "@/components/growth/WeaknessSourceBadge";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };

interface TrendDataPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}


const levelConfig: Record<
  WeaknessReminderLevel,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  critical: {
    label: "要注意",
    icon: <AlertCircle className="size-4 text-red-500" />,
    badgeClass: "border-red-300 bg-red-100 text-red-700",
  },
  warning: {
    label: "警告",
    icon: <AlertTriangle className="size-4 text-yellow-500" />,
    badgeClass: "border-yellow-300 bg-yellow-100 text-yellow-700",
  },
  improving: {
    label: "改善中",
    icon: <TrendingUp className="size-4 text-blue-500" />,
    badgeClass: "border-blue-300 bg-blue-100 text-blue-700",
  },
  resolved: {
    label: "解決済み",
    icon: <CheckCircle2 className="size-4 text-green-500" />,
    badgeClass: "border-green-300 bg-green-100 text-green-700",
  },
};

function WeaknessColumn({
  title,
  items,
  level,
  maxCount,
}: {
  title: string;
  items: WeaknessWithLevel[];
  level: WeaknessReminderLevel;
  maxCount: number;
}) {
  const cfg = levelConfig[level];
  const sorted = [...items].sort((a, b) => {
    const sourceOrder = { essay: 0, both: 1, interview: 2 };
    return (sourceOrder[a.source] ?? 1) - (sourceOrder[b.source] ?? 1);
  });
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {cfg.icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {items.length}件
        </Badge>
      </div>
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">該当なし</p>
        ) : (
          sorted.map((w) => (
            <Card key={w.area} className={`border border-l-4 ${sourceLeftBorder(w.source)}`}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium flex-1">{w.area}</p>
                  <WeaknessSourceBadge source={w.source} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        level === "resolved" ? "bg-emerald-400" :
                        level === "improving" ? "bg-blue-400" :
                        w.count >= 5 ? "bg-rose-400" : "bg-amber-400"
                      }`}
                      style={{ width: `${Math.min((w.count / Math.max(maxCount, 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{w.count}回</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function GrowthPage() {
  const { data: essayData, isLoading: loadingTrend } = useAuthSWR<{ essays: { submittedAt: string; scores?: { total: number } }[] }>("/api/essay/history?userId=current");
  const { data: reportData, isLoading: loadingReport } = useAuthSWR<GrowthReport>("/api/growth/report");
  const { data: weaknessData, isLoading: loadingWeaknesses } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>("/api/growth/weaknesses?context=dashboard");

  const report = reportData ?? null;

  const trendData = useMemo(() => {
    const essays = essayData?.essays ?? [];
    const trend = essays
      .filter((e) => e.scores)
      .map((e) => ({
        date: e.submittedAt.slice(5).replace("-", "/"),
        total: e.scores!.total,
        structure: 0,
        logic: 0,
        expression: 0,
        apAlignment: 0,
        originality: 0,
      }));
    return trend;
  }, [essayData]);

  const weaknesses = useMemo((): WeaknessWithLevel[] => {
    const items: WeaknessRecord[] = weaknessData?.weaknesses ?? [];
    if (items.length === 0) return [];
    return items
      .map((w) => ({ ...w, level: getWeaknessReminderLevel(w) }))
      .filter((w): w is WeaknessWithLevel => w.level !== null);
  }, [weaknessData]);

  const resolvedWeaknesses = weaknesses.filter((w) => w.level === "resolved");
  const activeWeaknesses = weaknesses.filter(
    (w) => w.level === "critical" || w.level === "warning"
  );
  const improvingWeaknesses = weaknesses.filter((w) => w.level === "improving");

  return (
    <div className="space-y-5 lg:space-y-8 px-4 py-5 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">成長トラッキング</h1>
        <p className="text-sm text-muted-foreground">あなたの学習成長を可視化します</p>
      </div>

      {/* AI成長レポート */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm lg:text-lg font-semibold">
          <Sparkles className="size-5" />
          AI成長レポート
        </h2>
        {loadingReport ? (
          <Skeleton className="h-48 w-full" />
        ) : report ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI総評</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">全体平均との比較</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {report.comparisonToAvg.map((c) => (
                    <div key={c.area} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{c.area}</p>
                      <p className="text-lg font-bold">{c.myScore}</p>
                      <div className="flex items-center justify-center gap-1 text-xs">
                        {c.myScore >= c.avgScore ? (
                          <ArrowUpRight className="size-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="size-3 text-red-500" />
                        )}
                        <span className="text-muted-foreground">平均 {c.avgScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">改善提案</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      <Separator />

      {/* 総合スコア推移 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm lg:text-lg font-semibold">
          <TrendingUp className="size-5" />
          総合スコア推移
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              合計スコア（0〜50点）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <Skeleton className="h-[220px] lg:h-[280px] w-full" />
            ) : trendData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">まだデータがありません</p>
            ) : (
              <div className="h-[220px] lg:h-[300px]">
                <ScoresTrendChart data={trendData} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 項目別推移 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm lg:text-lg font-semibold">
          <BarChart3 className="size-5" />
          項目別推移
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              各項目スコア（0〜10点）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <Skeleton className="h-[220px] lg:h-[280px] w-full" />
            ) : trendData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">まだデータがありません</p>
            ) : (
              <div className="h-[220px] lg:h-[300px]">
                <DetailedScoresTrendChart data={trendData} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* 弱点マップ */}
      <section>
        <h2 className="mb-4 text-sm lg:text-lg font-semibold">弱点マップ</h2>
        {loadingWeaknesses ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(() => {
              const maxCount = Math.max(...weaknesses.map(w => w.count), 1);
              return (
                <>
                  <WeaknessColumn title="要注意・警告" items={activeWeaknesses} level="critical" maxCount={maxCount} />
                  <WeaknessColumn title="改善中" items={improvingWeaknesses} level="improving" maxCount={maxCount} />
                  <WeaknessColumn title="解決済み" items={resolvedWeaknesses} level="resolved" maxCount={maxCount} />
                </>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
