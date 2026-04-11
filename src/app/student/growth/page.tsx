"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { DetailedScoresTrendChart } from "@/components/growth/DetailedScoresTrendChart";
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle2, BarChart3, Sparkles, ArrowUpRight, ArrowDownRight, Mic } from "lucide-react";
import Link from "next/link";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";
import type { GrowthReport } from "@/lib/types/analytics";
import type { InterviewScores, InterviewMode } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import { useAuthSWR } from "@/lib/api/swr";
import { WeaknessSourceBadge, sourceLeftBorder } from "@/components/growth/WeaknessSourceBadge";

interface InterviewHistoryItem {
  id: string;
  mode: InterviewMode;
  startedAt: string;
  duration: number;
  scores: InterviewScores | null;
  universityName: string;
  facultyName: string;
  totalScore: number;
}

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
  const { data: essayData, isLoading: loadingTrend } = useAuthSWR<{ essays: { submittedAt: string; status: string; scores?: { total: number; structure: number; logic: number; expression: number; apAlignment: number; originality: number } }[] }>("/api/essay/history?userId=current");
  const { data: interviewData, isLoading: loadingInterviews } = useAuthSWR<{ interviews: InterviewHistoryItem[] }>("/api/interview/history?userId=current");
  const { data: reportData, isLoading: loadingReport } = useAuthSWR<GrowthReport>("/api/growth/report");
  const { data: weaknessData, isLoading: loadingWeaknesses } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>("/api/growth/weaknesses?context=dashboard");

  const interviewList = useMemo(() => {
    const list = interviewData?.interviews ?? [];
    return [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [interviewData]);

  // 面接のみの時系列 (面接履歴セクション用)
  const interviewTrendData = useMemo(() => {
    return interviewList
      .filter((i) => i.scores && typeof i.scores.total === "number")
      .map((i) => {
        const d = new Date(i.startedAt);
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: i.scores!.total,
        };
      })
      .reverse(); // 新しい順 → 古い順にして時系列グラフに
  }, [interviewList]);

  const report = reportData ?? null;

  // 添削 (小論文) のみの時系列 — 項目別チャート用に 5 項目を保持
  const trendData = useMemo(() => {
    const essays = essayData?.essays ?? [];
    return essays
      .filter((e) => e.scores && e.status === "reviewed")
      .map((e) => {
        const d = new Date(e.submittedAt);
        const s = e.scores!;
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: s.total,
          structure: s.structure ?? 0,
          logic: s.logic ?? 0,
          expression: s.expression ?? 0,
          apAlignment: s.apAlignment ?? 0,
          originality: s.originality ?? 0,
        };
      });
  }, [essayData]);

  // 総合チャート用: 添削と面接を別系列で渡す
  const essaySeries = useMemo(
    () => trendData.map(({ date, total }) => ({ date, total })),
    [trendData],
  );
  const hasCombined = essaySeries.length > 0 || interviewTrendData.length > 0;

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
              小論文と面接の合計スコア(0〜50点)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend || loadingInterviews ? (
              <Skeleton className="h-[220px] lg:h-[280px] w-full" />
            ) : !hasCombined ? (
              <p className="text-sm text-muted-foreground text-center py-8">まだデータがありません</p>
            ) : (
              <div className="h-[260px] lg:h-[300px]">
                <ScoresTrendChart essayData={essaySeries} interviewData={interviewTrendData} />
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

      {/* 面接履歴 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm lg:text-lg font-semibold">
            <Mic className="size-5" />
            面接履歴
          </h2>
          <Link
            href="/student/interview/history"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            すべて見る <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {loadingInterviews ? (
              <Skeleton className="h-[200px] w-full" />
            ) : interviewList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                まだ面接練習の履歴がありません
              </p>
            ) : (
              <div className="space-y-4">
                {interviewTrendData.length >= 2 && (
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-2">面接スコア推移(0〜50)</p>
                    <ScoresTrendChart interviewData={interviewTrendData} />
                  </div>
                )}
                <div className="space-y-2">
                  {interviewList.slice(0, 8).map((i) => {
                    const d = new Date(i.startedAt);
                    const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                    const modeLabel = INTERVIEW_MODE_LABELS[i.mode] ?? i.mode;
                    const total = i.scores?.total ?? 0;
                    return (
                      <Link
                        key={i.id}
                        href={`/student/interview/${i.id}/result`}
                        className="group flex items-center justify-between rounded-md border border-border/50 p-3 transition-all hover:border-border hover:bg-muted/30"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {i.universityName || "大学情報なし"} {i.facultyName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dateStr}・{modeLabel}
                          </p>
                        </div>
                        <span className={`text-lg font-light tabular-nums ${
                          total >= 40 ? "text-emerald-600" : total >= 30 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {total}
                        </span>
                      </Link>
                    );
                  })}
                </div>
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
