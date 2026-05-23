"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { TeacherReportsSection } from "@/components/student/TeacherReportsSection";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { StudentGrowthReportView } from "@/components/student/StudentGrowthReportView";
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle2, Award, Clock } from "lucide-react";
import { WeaknessRecord, WeaknessReminderLevel, getWeaknessReminderLevel } from "@/lib/types/growth";
import type { GrowthReport as AdminGrowthReport } from "@/lib/types/growth-report";
import type { InterviewScores, InterviewMode } from "@/lib/types/interview";
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
    icon: <AlertCircle className="size-4 text-rose-500" />,
    badgeClass: "border-rose-300 bg-rose-100 text-rose-700",
  },
  warning: {
    label: "警告",
    icon: <AlertTriangle className="size-4 text-amber-500" />,
    badgeClass: "border-amber-300 bg-amber-100 text-amber-700",
  },
  improving: {
    label: "改善中",
    icon: <TrendingUp className="size-4 text-emerald-500" />,
    badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  resolved: {
    label: "解決済み",
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
    badgeClass: "border-emerald-400 bg-emerald-50 text-emerald-800",
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
    const sourceOrder: Record<string, number> = { essay: 0, both: 1, skill_check: 2, interview: 3 };
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
                        level === "resolved" ? "bg-emerald-500" :
                        level === "improving" ? "bg-emerald-400" :
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
  const { data: adminReports, isLoading: loadingAdminReports } = useAuthSWR<AdminGrowthReport[]>("/api/student/reports");
  const { data: weaknessData, isLoading: loadingWeaknesses } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>("/api/growth/weaknesses?context=dashboard");

  // 講師が作成した成長レポートを period 別に最新 1 件ずつ取り出す
  const reportsByPeriod = useMemo(() => {
    // defensive: generatedAt が string 以外で来ても落ちないようにする
    const keyOf = (v: unknown): string => {
      if (typeof v === "string") return v;
      if (v instanceof Date) return v.toISOString();
      return "";
    };
    const list = adminReports ?? [];
    const sortedDesc = [...list].sort((a, b) =>
      keyOf(b.generatedAt).localeCompare(keyOf(a.generatedAt)),
    );
    return {
      weekly: sortedDesc.find((r) => r.period === "weekly") ?? null,
      monthly: sortedDesc.find((r) => r.period === "monthly") ?? null,
    };
  }, [adminReports]);

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

  // 総合スコア推移のタブ切替
  const [trendTab, setTrendTab] = useState<"combined" | "essay" | "interview">("combined");

  // 添削 (小論文) のみの時系列 — 項目別チャート用に 5 項目を保持
  // API が desc 順で返すので、ここで昇順にソートしてグラフ左=古, 右=新 にする
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
          _ts: d.getTime(),
        };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts: _, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
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
    <div className="space-y-5 px-4 py-5 lg:space-y-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">成長</h1>
        <p className="text-sm text-muted-foreground">
          あなたの学習成長を可視化します
        </p>
      </div>

      {/* 画面トップのメインタブ: レポート / スコア推移 / 弱点 / 履歴 */}
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="report" className="gap-1.5">
            <Award className="size-4" />
            レポート
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5">
            <TrendingUp className="size-4" />
            スコア推移
          </TabsTrigger>
          <TabsTrigger value="weakness" className="gap-1.5">
            <AlertCircle className="size-4" />
            弱点
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="size-4" />
            履歴
          </TabsTrigger>
        </TabsList>

        {/* レポートタブ (内側に週次/月次タブ) */}
        <TabsContent value="report" className="mt-4 space-y-4">
          {loadingAdminReports ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Tabs defaultValue="weekly" className="w-full">
              <TabsList className="w-fit">
                <TabsTrigger value="weekly">週次</TabsTrigger>
                <TabsTrigger value="monthly">月次</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly" className="mt-4">
                {reportsByPeriod.weekly ? (
                  <StudentGrowthReportView report={reportsByPeriod.weekly} />
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      今週分の成長レポートはまだ届いていません。
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="monthly" className="mt-4">
                {reportsByPeriod.monthly ? (
                  <StudentGrowthReportView report={reportsByPeriod.monthly} />
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      今月分の成長レポートはまだ届いていません。
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* スコア推移タブ */}
        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  合計スコア (0〜50 点)
                </CardTitle>
                <SegmentControl
                  value={trendTab}
                  onChange={(v) =>
                    setTrendTab(v as "combined" | "essay" | "interview")
                  }
                  size="sm"
                  defaultAccent="blue"
                  options={[
                    { id: "combined", label: "総合" },
                    {
                      id: "essay",
                      label: "小論文",
                      count: essaySeries.length,
                    },
                    {
                      id: "interview",
                      label: "面接",
                      count: interviewTrendData.length,
                    },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingTrend || loadingInterviews ? (
                <Skeleton className="h-[220px] w-full lg:h-[280px]" />
              ) : !hasCombined ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  まだデータがありません
                </p>
              ) : (
                <div className="h-[260px] lg:h-[300px]">
                  {trendTab === "combined" && (
                    <ScoresTrendChart
                      essayData={essaySeries}
                      interviewData={interviewTrendData}
                    />
                  )}
                  {trendTab === "essay" &&
                    (essaySeries.length === 0 ? (
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        小論文のデータがありません
                      </p>
                    ) : (
                      <ScoresTrendChart essayData={essaySeries} />
                    ))}
                  {trendTab === "interview" &&
                    (interviewTrendData.length === 0 ? (
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        面接のデータがありません
                      </p>
                    ) : (
                      <ScoresTrendChart interviewData={interviewTrendData} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 弱点タブ */}
        <TabsContent value="weakness" className="mt-4">
          {loadingWeaknesses ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : weaknesses.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                まだ弱点が記録されていません。小論文や面接に取り組むと、ここに集計されます。
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(() => {
                const maxCount = Math.max(
                  ...weaknesses.map((w) => w.count),
                  1,
                );
                return (
                  <>
                    <WeaknessColumn
                      title="要注意・警告"
                      items={activeWeaknesses}
                      level="critical"
                      maxCount={maxCount}
                    />
                    <WeaknessColumn
                      title="改善中"
                      items={improvingWeaknesses}
                      level="improving"
                      maxCount={maxCount}
                    />
                    <WeaknessColumn
                      title="解決済み"
                      items={resolvedWeaknesses}
                      level="resolved"
                      maxCount={maxCount}
                    />
                  </>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* 履歴タブ (過去のレポート一覧) */}
        <TabsContent value="history" className="mt-4">
          <TeacherReportsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
