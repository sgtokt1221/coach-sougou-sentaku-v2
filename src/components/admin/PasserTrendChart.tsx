"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { indexPoints, pointAxisProps } from "@/components/charts/point-axis";

/**
 * 合格者の小論文の点の推移（50点換算）。点ごとに数値を出し、押さえると日付と点が出る。
 */
export function PasserTrendChart({
  series,
  height = 170,
}: {
  series: { at: string; score: number }[];
  height?: number;
}) {
  const rows = series.map((p) => ({
    date: new Date(p.at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    点: p.score,
  }));
  if (rows.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={indexPoints(rows)} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray={GRID_STYLE.strokeDasharray}
          stroke={GRID_STYLE.stroke}
          opacity={GRID_STYLE.opacity}
        />
        <XAxis {...pointAxisProps(rows)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 50]} ticks={[0, 25, 50]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
        <Tooltip content={<CustomTooltip labelKey="date" />} />
        <Line
          type="monotone"
          dataKey="点"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: "white", stroke: CHART_COLORS.primary, strokeWidth: 2 }}
          isAnimationActive={false}
        >
          <LabelList dataKey="点" position="top" fontSize={10} className="fill-foreground" />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
