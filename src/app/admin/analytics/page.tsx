"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Mic,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ShieldAlert,
  GraduationCap,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import type {
  AnalyticsOverview,
  WeaknessAnalytics,
  UniversityGapResponse,
  ScoreDistributionResponse,
  MonthlyTrendsResponse,
  WeaknessPatternsResponse,
} from "@/lib/types/analytics";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";

export default function AnalyticsPage() {
  const { userProfile } = useAuth();
  const isSuperadmin = userProfile?.role === "superadmin";

  const { data: overview, isLoading: loadingOverview } = useAuthSWR<AnalyticsOverview>(
    isSuperadmin ? "/api/admin/analytics/overview" : null
  );
  const { data: weaknesses, isLoading: loadingWeaknesses } = useAuthSWR<WeaknessAnalytics>(
    isSuperadmin ? "/api/admin/analytics/weaknesses" : null
  );
  const { data: universityGap, isLoading: loadingGap } = useAuthSWR<UniversityGapResponse>(
    isSuperadmin ? "/api/admin/analytics/university-gap" : null
  );
  const { data: monthlyTrends, isLoading: loadingTrends } = useAuthSWR<MonthlyTrendsResponse>(
    isSuperadmin ? "/api/admin/analytics/monthly-trends" : null
  );
  const { data: weaknessPatterns, isLoading: loadingPatterns } =
    useAuthSWR<WeaknessPatternsResponse>(
      isSuperadmin ? "/api/admin/analytics/weakness-patterns" : null
    );

  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <ShieldAlert className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">アクセス権限がありません</h2>
        <p className="text-sm text-muted-foreground">
          このページはスーパー管理者のみアクセスできます。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">分析ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          生徒全体の学習傾向と弱点パターンを分析します
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">概況</TabsTrigger>
          <TabsTrigger value="weaknesses">弱点分析</TabsTrigger>
          <TabsTrigger value="university-gap">大学別ギャップ</TabsTrigger>
          <TabsTrigger value="score-distribution">スコア分布</TabsTrigger>
          <TabsTrigger value="monthly-trends">月次推移</TabsTrigger>
          <TabsTrigger value="weakness-patterns">弱点パターン</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loadingOverview ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : overview ? (
            <OverviewContent overview={overview} />
          ) : null}
        </TabsContent>

        <TabsContent value="weaknesses" className="space-y-6">
          {loadingWeaknesses ? (
            <Skeleton className="h-96" />
          ) : weaknesses ? (
            <WeaknessContent weaknesses={weaknesses} />
          ) : null}
        </TabsContent>

        <TabsContent value="university-gap" className="space-y-6">
          {loadingGap ? (
            <Skeleton className="h-96" />
          ) : universityGap ? (
            <UniversityGapContent data={universityGap} />
          ) : null}
        </TabsContent>

        <TabsContent value="score-distribution" className="space-y-6">
          <ScoreDistributionContent />
        </TabsContent>

        <TabsContent value="monthly-trends" className="space-y-6">
          {loadingTrends ? (
            <Skeleton className="h-96" />
          ) : monthlyTrends ? (
            <MonthlyTrendsContent data={monthlyTrends} />
          ) : null}
        </TabsContent>

        <TabsContent value="weakness-patterns" className="space-y-6">
          {loadingPatterns ? (
            <Skeleton className="h-96" />
          ) : weaknessPatterns ? (
            <WeaknessPatternsContent data={weaknessPatterns} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewContent({ overview }: { overview: AnalyticsOverview }) {
  const stats = [
    {
      label: "総添削数",
      value: overview.totalEssays,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "総面接数",
      value: overview.totalInterviews,
      icon: Mic,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "平均添削スコア",
      value: `${overview.avgEssayScore}/50`,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "平均面接スコア",
      value: `${overview.avgInterviewScore}/40`,
      icon: BarChart3,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  const monthlyData = overview.monthlyTrend.map((m) => ({
    ...m,
    month: m.month.slice(5),
  }));

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">月次推移</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray={GRID_STYLE.strokeDasharray}
                stroke={GRID_STYLE.stroke}
                opacity={GRID_STYLE.opacity}
              />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="essays"
                stroke={CHART_COLORS.primary}
                name="添削数"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="interviews"
                stroke={CHART_COLORS.tertiary}
                name="面接数"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgScore"
                stroke={CHART_COLORS.quaternary}
                name="平均スコア"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">スコア分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overview.scoreDistribution}>
                <CartesianGrid
                  strokeDasharray={GRID_STYLE.strokeDasharray}
                  stroke={GRID_STYLE.stroke}
                  opacity={GRID_STYLE.opacity}
                />
                <XAxis dataKey="range" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.primary}
                  name="人数"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* University Popularity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">志望校人気ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.universityPopularity.map((uni, i) => (
                <div key={uni.universityName} className="flex items-center gap-3">
                  <span className="w-6 text-right text-sm font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{uni.universityName}</span>
                      <span className="text-sm text-muted-foreground">{uni.count}件</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(uni.count / overview.universityPopularity[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function WeaknessContent({ weaknesses }: { weaknesses: WeaknessAnalytics }) {
  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-rose-100 dark:bg-rose-950/30 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">弱点カテゴリ数</p>
              <p className="text-2xl font-bold">{weaknesses.topWeaknesses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平均改善日数</p>
              <p className="text-2xl font-bold">{weaknesses.avgDaysToResolve}日</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">改善パターン数</p>
              <p className="text-2xl font-bold">{weaknesses.improvementPatterns.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Weaknesses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">弱点TOP10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">#</th>
                  <th className="pb-3 font-medium text-muted-foreground">弱点エリア</th>
                  <th className="pb-3 font-medium text-muted-foreground">指摘回数</th>
                  <th className="pb-3 font-medium text-muted-foreground">改善率</th>
                </tr>
              </thead>
              <tbody>
                {weaknesses.topWeaknesses.map((w, i) => (
                  <tr key={w.area} className="border-b last:border-0">
                    <td className="py-3 font-medium">{i + 1}</td>
                    <td className="py-3">{w.area}</td>
                    <td className="py-3">{w.count}回</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${
                              w.improvementRate >= 70
                                ? "bg-emerald-500"
                                : w.improvementRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${w.improvementRate}%` }}
                          />
                        </div>
                        <span>{w.improvementRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Patterns (3C) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">改善成功パターン</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {weaknesses.improvementPatterns.map((p) => (
              <Card key={p.pattern} className="border">
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <p className="text-sm font-medium">{p.pattern}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">成功率 {p.successRate}%</Badge>
                    <Badge variant="outline">平均 {p.avgSubmissions}回提出</Badge>
                    <Badge variant="outline">{p.avgDaysToImprove}日で改善</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* University Gap (3B) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">大学別ギャップ分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weaknesses.universityGap.map((gap) => (
              <div key={gap.universityName} className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">{gap.universityName}</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">求められるスキル</p>
                    <div className="flex flex-wrap gap-1">
                      {gap.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">生徒の弱点ギャップ</p>
                    <div className="flex flex-wrap gap-1">
                      {gap.studentGap.map((g) => (
                        <Badge key={g} variant="destructive" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ========================================
 * University Gap Tab
 * ======================================== */
function UniversityGapContent({ data }: { data: UniversityGapResponse }) {
  const statusColors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
  };
  const statusLabels = {
    green: "順調",
    yellow: "要努力",
    red: "要注意",
  };

  if (data.gaps.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">分析大学数</p>
              <p className="text-2xl font-bold">{data.gaps.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-rose-100 dark:bg-rose-950/30 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">要注意</p>
              <p className="text-2xl font-bold">
                {data.gaps.filter((g) =>
                  g.gapAnalysis.some((a) => a.status === "red")
                ).length}
                校
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">順調</p>
              <p className="text-2xl font-bold">
                {data.gaps.filter((g) =>
                  g.gapAnalysis.every((a) => a.status === "green")
                ).length}
                校
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.gaps.map((gap) => {
        const overallStatus = gap.gapAnalysis.some((a) => a.status === "red")
          ? "red"
          : gap.gapAnalysis.some((a) => a.status === "yellow")
            ? "yellow"
            : "green";

        return (
          <Card key={`${gap.universityId}-${gap.facultyId}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  {gap.universityName} - {gap.facultyName}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  対象生徒: {gap.studentCount}名 | 添削平均: {gap.avgEssayScore}/50 | 面接平均:{" "}
                  {gap.avgInterviewScore}/40
                </p>
              </div>
              <Badge
                className={`${statusColors[overallStatus]} border-0 text-xs`}
              >
                {statusLabels[overallStatus]}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">評価項目</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">生徒平均</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">必要水準</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">ギャップ</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.gapAnalysis.map((item) => (
                      <tr key={item.area} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{item.area}</td>
                        <td className="py-2.5 text-right">{item.studentAvg}</td>
                        <td className="py-2.5 text-right">{item.required}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={
                              item.gap >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : item.gap >= -1.5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {item.gap > 0 ? "+" : ""}
                            {item.gap}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge
                            className={`${statusColors[item.status]} border-0 text-xs`}
                          >
                            {statusLabels[item.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

/* ========================================
 * Score Distribution Tab
 * ======================================== */
function ScoreDistributionContent() {
  const [scoreType, setScoreType] = useState<string>("both");
  const [period, setPeriod] = useState<string>("all");

  const params = new URLSearchParams({ type: scoreType, period });
  const { data, isLoading } = useAuthSWR<ScoreDistributionResponse>(
    `/api/admin/analytics/score-distribution?${params.toString()}`
  );

  const DIST_COLORS = [
    "oklch(var(--chart-5))", // red-ish for 0-20
    "oklch(var(--chart-4))", // orange for 21-40
    "oklch(var(--chart-2))", // yellow for 41-60
    "oklch(var(--chart-3))", // blue for 61-80
    "oklch(var(--chart-1))", // green for 81-100
  ];

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Select value={scoreType} onValueChange={(v: string | null) => setScoreType(v ?? "both")}>
          <SelectTrigger>
            <SelectValue placeholder="タイプ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">添削 + 面接</SelectItem>
            <SelectItem value="essay">添削のみ</SelectItem>
            <SelectItem value="interview">面接のみ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v: string | null) => setPeriod(v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="期間" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全期間</SelectItem>
            <SelectItem value="30d">直近30日</SelectItem>
            <SelectItem value="90d">直近90日</SelectItem>
            <SelectItem value="180d">直近180日</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(scoreType === "both" || scoreType === "essay") && data.essay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  添削スコア分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.essay}>
                    <CartesianGrid
                      strokeDasharray={GRID_STYLE.strokeDasharray}
                      stroke={GRID_STYLE.stroke}
                      opacity={GRID_STYLE.opacity}
                    />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      name="件数"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={CHART_ANIMATION.duration}
                      animationEasing={CHART_ANIMATION.easing}
                    >
                      {data.essay.map((_, index) => (
                        <Cell key={index} fill={DIST_COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                  {data.essay.map((d) => (
                    <span key={d.range}>
                      {d.range}: {d.percentage}%
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(scoreType === "both" || scoreType === "interview") && data.interview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="size-4" />
                  面接スコア分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.interview}>
                    <CartesianGrid
                      strokeDasharray={GRID_STYLE.strokeDasharray}
                      stroke={GRID_STYLE.stroke}
                      opacity={GRID_STYLE.opacity}
                    />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      name="件数"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={CHART_ANIMATION.duration}
                      animationEasing={CHART_ANIMATION.easing}
                    >
                      {data.interview.map((_, index) => (
                        <Cell key={index} fill={DIST_COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                  {data.interview.map((d) => (
                    <span key={d.range}>
                      {d.range}: {d.percentage}%
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </>
  );
}

/* ========================================
 * Monthly Trends Tab
 * ======================================== */
function MonthlyTrendsContent({ data }: { data: MonthlyTrendsResponse }) {
  if (data.trends.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.trends.map((t) => ({
    ...t,
    month: t.month.slice(5), // "2026-04" -> "04"
  }));

  const totalSubmissions = data.trends.reduce((sum, t) => sum + t.submissionCount, 0);
  const avgStudents =
    data.trends.length > 0
      ? Math.round(data.trends.reduce((sum, t) => sum + t.studentCount, 0) / data.trends.length)
      : 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総提出数</p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-indigo-100 dark:bg-indigo-950/30 p-2 text-indigo-600 dark:text-indigo-400">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">月平均生徒数</p>
              <p className="text-2xl font-bold">{avgStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">期間</p>
              <p className="text-2xl font-bold">{data.trends.length}ヶ月</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">スコア月次推移</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray={GRID_STYLE.strokeDasharray}
                stroke={GRID_STYLE.stroke}
                opacity={GRID_STYLE.opacity}
              />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                domain={[0, 100]}
                label={{ value: "スコア", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                label={{ value: "件数", angle: 90, position: "insideRight", style: { fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="essayAvg"
                stroke={CHART_COLORS.primary}
                name="添削平均"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="interviewAvg"
                stroke={CHART_COLORS.tertiary}
                name="面接平均"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={<CustomActiveDot />}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Bar
                yAxisId="right"
                dataKey="submissionCount"
                fill={CHART_COLORS.quaternary}
                name="提出件数"
                opacity={0.3}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}

/* ========================================
 * Weakness Patterns Tab
 * ======================================== */
function WeaknessPatternsContent({ data }: { data: WeaknessPatternsResponse }) {
  const [sortKey, setSortKey] = useState<
    "occurrenceCount" | "resolutionRate" | "avgResolutionDays" | "affectedStudents"
  >("occurrenceCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (
    key: "occurrenceCount" | "resolutionRate" | "avgResolutionDays" | "affectedStudents"
  ) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedPatterns = [...data.patterns].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortOrder === "asc" ? diff : -diff;
  });

  if (data.patterns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">弱点パターンデータがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-rose-100 dark:bg-rose-950/30 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総弱点検出数</p>
              <p className="text-2xl font-bold">{data.totalWeaknesses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">全体解決率</p>
              <p className="text-2xl font-bold">{data.overallResolutionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/30 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平均解決日数</p>
              <p className="text-2xl font-bold">{data.avgResolutionDays}日</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">パターン数</p>
              <p className="text-2xl font-bold">{data.patterns.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">弱点パターン一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">弱点</th>
                  <th
                    className="cursor-pointer pb-3 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort("occurrenceCount")}
                  >
                    <span className="inline-flex items-center gap-1">
                      検出回数
                      <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                  <th className="hidden pb-3 text-right font-medium text-muted-foreground sm:table-cell">
                    解決数
                  </th>
                  <th
                    className="cursor-pointer pb-3 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort("resolutionRate")}
                  >
                    <span className="inline-flex items-center gap-1">
                      解決率
                      <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                  <th
                    className="hidden cursor-pointer pb-3 text-right font-medium text-muted-foreground hover:text-foreground md:table-cell"
                    onClick={() => handleSort("avgResolutionDays")}
                  >
                    <span className="inline-flex items-center gap-1">
                      平均解決日数
                      <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                  <th
                    className="hidden cursor-pointer pb-3 text-right font-medium text-muted-foreground hover:text-foreground lg:table-cell"
                    onClick={() => handleSort("affectedStudents")}
                  >
                    <span className="inline-flex items-center gap-1">
                      影響生徒数
                      <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPatterns.map((p) => (
                  <tr key={p.weakness} className="border-b last:border-0">
                    <td className="py-3">
                      <div>
                        <span className="font-medium">{p.weakness}</span>
                        {p.relatedUniversities.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.relatedUniversities.slice(0, 3).map((uni) => (
                              <Badge key={uni} variant="outline" className="text-[10px]">
                                {uni}
                              </Badge>
                            ))}
                            {p.relatedUniversities.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{p.relatedUniversities.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">{p.occurrenceCount}</td>
                    <td className="hidden py-3 text-right sm:table-cell">{p.resolvedCount}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden h-2 w-12 rounded-full bg-muted sm:block">
                          <div
                            className={`h-2 rounded-full ${
                              p.resolutionRate >= 70
                                ? "bg-emerald-500"
                                : p.resolutionRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(p.resolutionRate, 100)}%` }}
                          />
                        </div>
                        <span
                          className={
                            p.resolutionRate >= 70
                              ? "text-emerald-600 dark:text-emerald-400"
                              : p.resolutionRate >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {p.resolutionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="hidden py-3 text-right md:table-cell">{p.avgResolutionDays}日</td>
                    <td className="hidden py-3 text-right lg:table-cell">{p.affectedStudents}名</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
