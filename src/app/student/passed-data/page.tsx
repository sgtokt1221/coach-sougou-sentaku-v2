"use client";

import { useEffect, useState } from "react";
import { useAuthSWR } from "@/lib/api/swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Users,
  Trophy,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";
import type { PassedDataResponse, PassedDataCompareResponse } from "@/lib/types/passed-data";
import type { University } from "@/lib/types/university";

export default function PassedDataPage() {
  const { data: uniData, isLoading: loadingUni } = useAuthSWR<{ universities: University[] }>("/api/universities");
  const universities = uniData?.universities ?? [];

  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [stats, setStats] = useState<PassedDataResponse | null>(null);
  const [compare, setCompare] = useState<PassedDataCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedUni = universities.find((u) => u.id === universityId);
  const faculties = selectedUni?.faculties ?? [];

  useEffect(() => {
    if (!universityId || !facultyId) {
      setStats(null);
      setCompare(null);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/passed-data/${universityId}/${facultyId}`).then((r) => r.json()),
      fetch(`/api/passed-data/compare?universityId=${universityId}&facultyId=${facultyId}`).then(
        (r) => r.json()
      ),
    ])
      .then(([statsData, compareData]) => {
        setStats(statsData);
        setCompare(compareData);
      })
      .catch(() => {
        setStats(null);
        setCompare(null);
      })
      .finally(() => setLoading(false));
  }, [universityId, facultyId]);

  const chartData =
    stats?.statistics.scoreProgressionPattern.map((p) => ({
      label: `${p.weeksBeforeExam}週前`,
      passedAvg: p.avgScore,
      ...(compare?.weeklyComparison.find(
        (c) => c.weeksBeforeExam === p.weeksBeforeExam
      )
        ? {
            myScore: compare.weeklyComparison.find(
              (c) => c.weeksBeforeExam === p.weeksBeforeExam
            )!.studentScore,
          }
        : {}),
    })) ?? [];

  return (
    <div className="space-y-5 lg:space-y-8 px-4 py-5 lg:px-6 lg:py-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">合格者データ</h1>
        <p className="text-sm text-muted-foreground">
          過去の合格者のデータを参考にしましょう
        </p>
      </div>

      {/* University / Faculty Selection */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
          {loadingUni ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">大学</p>
                <Select
                  value={universityId || "_none"}
                  onValueChange={(v: string | null) => {
                    setUniversityId(!v || v === "_none" ? "" : v);
                    setFacultyId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="大学を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">選択してください</SelectItem>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">学部</p>
                <Select
                  value={facultyId || "_none"}
                  onValueChange={(v: string | null) =>
                    setFacultyId(!v || v === "_none" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="学部を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">選択してください</SelectItem>
                    {faculties.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Insufficient Data */}
      {stats?.insufficient && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="size-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              この大学・学部のデータはまだ十分ではありません（最低5件必要）
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && !stats.insufficient && !loading && (
        <>
          {/* Sample Size */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>
              {stats.universityName} {stats.facultyName} - 合格者{stats.sampleSize}
              名のデータ
            </span>
          </div>

          {/* Average Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="size-3.5" />
                  平均添削回数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.statistics.avgEssaySubmissions}
                  <span className="text-sm font-normal text-muted-foreground">回</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  平均面接回数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.statistics.avgInterviewPractices}
                  <span className="text-sm font-normal text-muted-foreground">回</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy className="size-3.5" />
                  最終小論文スコア
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.statistics.avgFinalEssayScore}
                  <span className="text-sm font-normal text-muted-foreground">/50</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy className="size-3.5" />
                  最終面接スコア
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.statistics.avgFinalInterviewScore}
                  <span className="text-sm font-normal text-muted-foreground">/40</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  弱点克服日数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats.statistics.avgWeaknessResolutionDays}
                  <span className="text-sm font-normal text-muted-foreground">日</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Comparison */}
          {compare && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="size-5" />
                あなた vs 合格者平均
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Badge
                      variant={compare.scoreDiff >= 0 ? "default" : "destructive"}
                      className="text-sm"
                    >
                      {compare.scoreDiff >= 0 ? "+" : ""}
                      {compare.scoreDiff}点
                    </Badge>
                    <p className="text-sm">{compare.message}</p>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray={GRID_STYLE.strokeDasharray}
                        stroke={GRID_STYLE.stroke}
                        opacity={GRID_STYLE.opacity}
                      />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 50]} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="passedAvg"
                        name="合格者平均"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={<CustomActiveDot />}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                        animationEasing={CHART_ANIMATION.easing}
                      />
                      <Line
                        type="monotone"
                        dataKey="myScore"
                        name="あなた"
                        stroke={CHART_COLORS.tertiary}
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
            </section>
          )}

          <Separator />

          {/* Weaknesses */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-5" />
              よくある弱点と克服パターン
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    初期の主な弱点
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.statistics.topInitialWeaknesses.map((w) => (
                    <div key={w.area}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{w.area}</span>
                        <span className="text-muted-foreground">{w.frequency}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-rose-400"
                          style={{ width: `${w.frequency}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    合格前に克服した弱点
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.statistics.topResolvedBeforePass.map((w) => (
                    <div
                      key={w.area}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">{w.area}</span>
                      <Badge variant="secondary">
                        平均{w.avgDaysToResolve}日で克服
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      {/* Empty state when no selection */}
      {!universityId && !loading && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Trophy}
              title="大学・学部を選択してデータを表示"
              description="上のセレクトから大学と学部を選択してください"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
