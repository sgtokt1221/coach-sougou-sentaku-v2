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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";

interface WeaknessTopChartProps {
  weaknesses: WeaknessRecord[];
}

interface WeaknessChartData {
  area: string;
  count: number;
  source: "essay" | "interview" | "skill_check" | "both";
  severity: "critical" | "warning" | "improving" | "resolved";
}

/**
 * source別の色マッピング
 */
const SOURCE_COLORS: Record<string, string> = {
  essay: "#3b82f6",      // blue
  interview: "#6366f1",  // indigo
  skill_check: "#10b981", // emerald
  both: "#8b5cf6",       // purple
};

/**
 * カスタムツールチップ
 */
function WeaknessTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as WeaknessChartData;
  const sourceLabels: Record<string, string> = {
    essay: "小論文",
    interview: "面接",
    skill_check: "スキルチェック",
    both: "複数",
  };

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="font-medium">{data.area}</p>
      <p className="text-sm">指摘回数: {data.count}回</p>
      <p className="text-sm">出所: {sourceLabels[data.source] || data.source}</p>
      {data.count >= 5 && (
        <p className="text-sm font-medium text-red-600">要注意</p>
      )}
    </div>
  );
}

/**
 * Y軸ラベルを短縮表示
 */
function formatYAxisLabel(value: string) {
  if (value.length <= 10) return value;
  return value.substring(0, 10) + "...";
}

export function WeaknessTopChart({ weaknesses }: WeaknessTopChartProps) {
  // 未解決弱点のみフィルタ → count降順ソート → Top5
  const unresolvedWeaknesses = weaknesses.filter(w => !w.resolved);
  const sortedWeaknesses = unresolvedWeaknesses.sort((a, b) => b.count - a.count);
  const top5 = sortedWeaknesses.slice(0, 5);
  const remainingCount = Math.max(0, unresolvedWeaknesses.length - 5);

  // チャート用データ作成
  const chartData: WeaknessChartData[] = top5.map(w => ({
    area: w.area,
    count: w.count,
    source: w.source as "essay" | "interview" | "skill_check" | "both",
    severity: getWeaknessReminderLevel(w),
  }));

  if (unresolvedWeaknesses.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            重点弱点 Top 5
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            現在、未解決弱点はありません
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4" />
          重点弱点 Top 5
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="horizontal"
              data={chartData}
              margin={{ top: 8, right: 8, left: 60, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="area"
                tick={{ fontSize: 10 }}
                tickFormatter={formatYAxisLabel}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip content={<WeaknessTooltip />} />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 残りの弱点数表示 */}
        {remainingCount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground text-center">
              他 {remainingCount} 件の弱点があります
            </p>
          </div>
        )}

        {/* ステータス凡例 */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="destructive" className="text-xs">要注意</Badge>
            <Badge variant="outline" className="text-xs border-yellow-400 bg-yellow-50 text-yellow-700">
              警告
            </Badge>
            <Badge variant="outline" className="text-xs border-blue-400 bg-blue-50 text-blue-700">
              改善中
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}