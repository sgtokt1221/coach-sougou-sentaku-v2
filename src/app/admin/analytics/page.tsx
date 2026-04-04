"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import type { AnalyticsOverview, WeaknessAnalytics } from "@/lib/types/analytics";
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
} from "recharts";
import { CHART_COLORS, SCORE_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">分析ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          生徒全体の学習傾向と弱点パターンを分析します
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概況</TabsTrigger>
          <TabsTrigger value="weaknesses">弱点分析</TabsTrigger>
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
