"use client";

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
import { SCORE_LINES, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
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

interface DetailedScoresTrendChartProps {
  data: TrendDataPoint[];
}

export function DetailedScoresTrendChart({ data }: DetailedScoresTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        まだデータがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          domain={[0, 10]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SCORE_LINES.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={<CustomActiveDot />}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
