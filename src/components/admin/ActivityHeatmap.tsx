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
    logicDrill: "論理ドリル",
    choco: "ちょこ添削",
    topicInput: "ネタインプット",
    interviewDrill: "面接ドリル",
    selfAnalysis: "自己分析",
    document: "提出書類",
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
    day.drill > 0 || day.logicDrill > 0 || day.choco > 0 || day.topicInput > 0 || day.interviewDrill > 0 || day.selfAnalysis > 0 || day.document > 0
  );

  // 合計回数 (30日間)
  const totals = data.reduce(
    (acc, d) => ({
      essay: acc.essay + d.essay,
      interview: acc.interview + d.interview,
      skillCheck: acc.skillCheck + d.skillCheck,
      drill: acc.drill + d.drill,
      logicDrill: acc.logicDrill + d.logicDrill,
      choco: acc.choco + d.choco,
      topicInput: acc.topicInput + d.topicInput,
      interviewDrill: acc.interviewDrill + d.interviewDrill,
      selfAnalysis: acc.selfAnalysis + d.selfAnalysis,
      document: acc.document + d.document,
    }),
    { essay: 0, interview: 0, skillCheck: 0, drill: 0, logicDrill: 0, choco: 0, topicInput: 0, interviewDrill: 0, selfAnalysis: 0, document: 0 },
  );
  // 直近7日にアクティブだった日の数
  const activeDaysRecent = data.slice(-7).filter(d =>
    d.essay > 0 || d.interview > 0 || d.skillCheck > 0 ||
    d.drill > 0 || d.logicDrill > 0 || d.choco > 0 || d.topicInput > 0 || d.interviewDrill > 0 || d.selfAnalysis > 0 || d.document > 0
  ).length;

  // 系統別にグルーピング。系統ごとに1つの色相で統一し、内訳は濃淡で区別する。
  // color=系統のアクセント色 / tint=カード背景の淡色 / 各itemのfill=グラフ棒の濃淡
  const summaryGroups = [
    {
      title: "添削系",
      color: "#059669",
      tint: "rgba(16,185,129,0.08)",
      items: [
        { key: "essay", label: "添削", value: totals.essay, fill: "#047857" },
        { key: "drill", label: "要約ドリル", value: totals.drill, fill: "#059669" },
        { key: "logicDrill", label: "論理ドリル", value: totals.logicDrill, fill: "#10b981" },
        { key: "choco", label: "ちょこ添削", value: totals.choco, fill: "#34d399" },
        { key: "topicInput", label: "ネタインプット", value: totals.topicInput, fill: "#6ee7b7" },
      ],
    },
    {
      title: "面接系",
      color: "#4f46e5",
      tint: "rgba(99,102,241,0.08)",
      items: [
        { key: "interview", label: "面接", value: totals.interview, fill: "#4f46e5" },
        { key: "interviewDrill", label: "面接ドリル", value: totals.interviewDrill, fill: "#818cf8" },
      ],
    },
    {
      title: "提出書類系",
      color: "#0891b2",
      tint: "rgba(8,145,178,0.08)",
      items: [{ key: "document", label: "書類", value: totals.document, fill: "#0891b2" }],
    },
    {
      title: "自己分析系",
      color: "#d97706",
      tint: "rgba(217,119,6,0.08)",
      items: [
        { key: "selfAnalysis", label: "自己分析", value: totals.selfAnalysis, fill: "#d97706" },
        { key: "skillCheck", label: "スキル", value: totals.skillCheck, fill: "#f59e0b" },
      ],
    },
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
        {/* 合計サマリー（系統別4カード。系統合計を主役にし、内訳は小さく併記） */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {summaryGroups.map((group) => {
            const groupTotal = group.items.reduce((s, i) => s + i.value, 0);
            return (
              <div
                key={group.title}
                className="rounded-lg border p-2.5"
                style={{ borderColor: group.color, backgroundColor: group.tint }}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-semibold" style={{ color: group.color }}>
                    {group.title}
                  </span>
                  <span
                    className="text-xl font-bold tabular-nums leading-none"
                    style={{ color: group.color }}
                  >
                    {groupTotal}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {group.items.map((item) => (
                    <span key={item.key} className="whitespace-nowrap">
                      {item.label}
                      <span className="ml-0.5 font-semibold text-foreground tabular-nums">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
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

                {/* スタック棒グラフ。系統順に並べ、同系統は同色相の濃淡で表示 */}
                {summaryGroups.flatMap((g) => g.items).map((item, i, arr) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    stackId="activity"
                    name={item.label}
                    fill={item.fill}
                    radius={i === arr.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}