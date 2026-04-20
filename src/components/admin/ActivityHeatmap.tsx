"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { ActivityHeatmapData } from "@/lib/utils/activity-heatmap";

interface ActivityHeatmapProps {
  data: ActivityHeatmapData[];
}

/**
 * カスタムツールチップ - アクティビティタイプ別の詳細表示
 */
function ActivityTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const typeLabels: Record<string, string> = {
    essay: "小論文添削",
    interview: "面接",
    skillCheck: "スキルチェック",
    drill: "要約ドリル",
    topicInput: "ネタインプット",
    interviewDrill: "面接ドリル",
  };

  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="font-medium">{label}</p>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">活動なし</p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium">合計: {total}回</p>
          {payload
            .filter((entry: any) => entry.value > 0)
            .map((entry: any) => (
              <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
                {typeLabels[entry.dataKey] || entry.dataKey}: {entry.value}回
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * X軸の日付フォーマット - 5日おきに表示
 */
function formatXAxisTick(value: string, index: number) {
  return index % 5 === 0 ? value : "";
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // 全期間で活動があるかチェック
  const hasAnyActivity = data.some(day =>
    day.essay > 0 || day.interview > 0 || day.skillCheck > 0 ||
    day.drill > 0 || day.topicInput > 0 || day.interviewDrill > 0
  );

  // 合計回数 (30日間)
  const totals = data.reduce(
    (acc, d) => ({
      essay: acc.essay + d.essay,
      interview: acc.interview + d.interview,
      skillCheck: acc.skillCheck + d.skillCheck,
      drill: acc.drill + d.drill,
      topicInput: acc.topicInput + d.topicInput,
      interviewDrill: acc.interviewDrill + d.interviewDrill,
    }),
    { essay: 0, interview: 0, skillCheck: 0, drill: 0, topicInput: 0, interviewDrill: 0 },
  );
  // 直近7日にアクティブだった日の数
  const activeDaysRecent = data.slice(-7).filter(d =>
    d.essay > 0 || d.interview > 0 || d.skillCheck > 0 ||
    d.drill > 0 || d.topicInput > 0 || d.interviewDrill > 0
  ).length;

  const summaryItems = [
    { label: "添削", value: totals.essay, color: "#10b981" },
    { label: "面接", value: totals.interview, color: "#6366f1" },
    { label: "スキル", value: totals.skillCheck, color: "#8b5cf6" },
    { label: "要約ドリル", value: totals.drill, color: "#f59e0b" },
    { label: "ネタインプット", value: totals.topicInput, color: "#0ea5e9" },
    { label: "面接ドリル", value: totals.interviewDrill, color: "#f43f5e" },
  ];

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="size-4" />
            活動状況（直近30日）
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            直近7日: <span className="font-semibold text-foreground">{activeDaysRecent}日</span> 活動
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 合計サマリーストリップ */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-border/40 bg-slate-50 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <span className="inline-block size-1.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
              <div className="text-lg font-bold tabular-nums">{item.value}</div>
            </div>
          ))}
        </div>

        {!hasAnyActivity ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
            直近30日間に活動がありません
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatXAxisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip content={<ActivityTooltip />} />

                {/* スタック棒グラフ - 各活動タイプ */}
                <Bar
                  dataKey="essay"
                  stackId="activity"
                  name="添削"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="interview"
                  stackId="activity"
                  name="面接"
                  fill="#6366f1"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="skillCheck"
                  stackId="activity"
                  name="スキルチェック"
                  fill="#8b5cf6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="drill"
                  stackId="activity"
                  name="要約ドリル"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="topicInput"
                  stackId="activity"
                  name="ネタインプット"
                  fill="#0ea5e9"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="interviewDrill"
                  stackId="activity"
                  name="面接ドリル"
                  fill="#f43f5e"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}