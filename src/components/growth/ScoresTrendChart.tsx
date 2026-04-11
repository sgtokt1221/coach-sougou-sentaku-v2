"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";

interface TrendDataPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}

interface ScoresTrendChartProps {
  data: TrendDataPoint[];
}

export function ScoresTrendChart({ data }: ScoresTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        まだデータがありません
      </div>
    );
  }

  // 1データ点の場合、前後にダミー点を追加して中央に表示
  const chartData = data.length === 1
    ? [{ ...data[0], date: "", total: null }, data[0], { ...data[0], date: " ", total: null }]
    : data;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray={GRID_STYLE.strokeDasharray}
          stroke={GRID_STYLE.stroke}
          opacity={GRID_STYLE.opacity}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 50]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip
          content={<CustomTooltip />}
          formatter={(value) => [`${value}点`, "合計スコア"]}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="合計スコア"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 5, fill: "white", stroke: CHART_COLORS.primary, strokeWidth: 2 }}
          activeDot={<CustomActiveDot />}
          connectNulls={false}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
