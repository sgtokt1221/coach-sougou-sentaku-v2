"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} horizontal={false} />
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
                tick={{ fontSize: 11 }}
                tickFormatter={formatYAxisLabel}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<WeaknessTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={SOURCE_COLORS[entry.source] ?? "#6366f1"} />
                ))}
              </Bar>
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

        {/* 出所別凡例 */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[11px] text-muted-foreground">
            {[
              { color: SOURCE_COLORS.essay, label: "小論文" },
              { color: SOURCE_COLORS.interview, label: "面接" },
              { color: SOURCE_COLORS.skill_check, label: "スキルチェック" },
              { color: SOURCE_COLORS.both, label: "複数" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}