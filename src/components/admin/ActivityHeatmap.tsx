"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    activity: "活動登録",
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
    day.drill > 0 || day.activity > 0
  );

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" />
          活動状況（直近30日）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyActivity ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            直近30日間に活動がありません
          </div>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatXAxisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ActivityTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />

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
                  dataKey="activity"
                  stackId="activity"
                  name="活動登録"
                  fill="#e11d48"
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