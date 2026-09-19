"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, TrendingUp, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_COLORS,
  CHART_ANIMATION,
  GRID_STYLE,
  INTERVIEW_SCORE_LINES,
} from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { DetailedScoresTrendChart } from "@/components/growth/DetailedScoresTrendChart";
import type { InterviewMode } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import { useAuthSWR } from "@/lib/api/swr";
import { InterviewInProgressSection } from "@/components/interview/InterviewInProgressSection";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";

interface InterviewHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  mode: InterviewMode;
  practicedAt: string;
  totalScore: number;
  /** 合計の満点。口頭試問は50、それ以外は40。旧データは無し */
  totalMax?: number;
  clarity: number;
  apAlignment: number;
  enthusiasm: number;
  specificity: number;
  /** 動画なしの回は null（評価不能）。0 と混ぜない */
  bodyLanguage: number | null;
}

const MODE_VARIANT: Record<
  InterviewMode,
  "default" | "secondary" | "outline" | "destructive"
> = {
  individual: "default",
  group_discussion: "secondary",
  presentation: "outline",
  oral_exam: "secondary",
};

export default function InterviewHistoryPage() {
  const router = useRouter();
  const [chartTab, setChartTab] = useState<"total" | "detailed">("total");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawData, isLoading: loading } = useAuthSWR<{
    interviews: any[];
  }>("/api/interview/history?userId=current");
  const history: InterviewHistoryItem[] = (rawData?.interviews ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => ({
      id: item.id,
      universityName:
        item.universityName ?? item.universityContext?.universityName ?? "",
      facultyName:
        item.facultyName ?? item.universityContext?.facultyName ?? "",
      mode: item.mode ?? "individual",
      practicedAt:
        item.practicedAt ??
        (item.startedAt
          ? new Date(item.startedAt).toISOString().slice(0, 10)
          : ""),
      totalScore: item.totalScore ?? item.scores?.total ?? 0,
      clarity: item.scores?.clarity ?? 0,
      apAlignment: item.scores?.apAlignment ?? 0,
      enthusiasm: item.scores?.enthusiasm ?? 0,
      specificity: item.scores?.specificity ?? 0,
      bodyLanguage: item.scores?.bodyLanguage ?? null,
    })
  );
  const historyToShow = history;

  const sortedAsc = [...historyToShow].sort((a, b) =>
    a.practicedAt.localeCompare(b.practicedAt)
  );
  const chartData = sortedAsc.map((item) => ({
    date: item.practicedAt,
    score: item.totalScore,
  }));
  const detailedChartData = sortedAsc.map((item) => ({
    date: item.practicedAt,
    total: item.totalScore,
    clarity: item.clarity,
    apAlignment: item.apAlignment,
    enthusiasm: item.enthusiasm,
    specificity: item.specificity,
    bodyLanguage: item.bodyLanguage,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:space-y-6 lg:px-6 lg:py-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
          <TrendingUp className="size-5" />
          面接履歴
        </h1>
        <Button onClick={() => router.push("/student/interview/new")}>
          <Plus className="mr-2 size-4" />
          新規練習
        </Button>
      </div>

      <InterviewInProgressSection />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : historyToShow.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Mic}
              title="まだ面接練習がありません"
              description="最初の模擬面接を始めましょう！"
              action={{
                label: "面接練習を始める",
                href: "/student/interview/new",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* スコア推移グラフ */}
          {historyToShow.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">スコア推移</CardTitle>
                  <SegmentControl
                    value={chartTab}
                    onChange={(v) => setChartTab(v as "total" | "detailed")}
                    size="sm"
                    defaultAccent="blue"
                    options={[
                      { id: "total", label: "総合" },
                      { id: "detailed", label: "項目別" },
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {chartTab === "total" ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray={GRID_STYLE.strokeDasharray}
                        stroke={GRID_STYLE.stroke}
                        opacity={GRID_STYLE.opacity}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 50]}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="総合スコア"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2.5}
                        dot={<CustomDot />}
                        activeDot={<CustomActiveDot />}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                        animationEasing={CHART_ANIMATION.easing}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <DetailedScoresTrendChart
                    data={detailedChartData}
                    lines={INTERVIEW_SCORE_LINES}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* 履歴カードリスト */}
          <div className="space-y-3">
            {historyToShow.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() =>
                  router.push(`/student/interview/${item.id}/result`)
                }
              >
                <CardContent className="flex items-center justify-between gap-3 p-3 lg:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.universityName}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {item.facultyName}
                      </span>
                      <Badge
                        variant={MODE_VARIANT[item.mode]}
                        className="text-xs"
                      >
                        {INTERVIEW_MODE_LABELS[item.mode]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.practicedAt}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.totalScore > 0 && (
                      <SkillRankBadge
                        rank={scoreToSkillRank(
                          item.totalScore,
                          item.totalMax ?? 40
                        )}
                        size="sm"
                        animate={false}
                      />
                    )}
                    <span className="text-lg font-bold">
                      {item.totalScore}
                      <span className="text-muted-foreground text-sm">
                        /{item.totalMax ?? 40}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
