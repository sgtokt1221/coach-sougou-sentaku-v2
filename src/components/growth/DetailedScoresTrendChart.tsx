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

const SCORE_LINES = [
  { key: "structure", label: "構成", color: "#6366f1" },
  { key: "logic", label: "論理性", color: "#f59e0b" },
  { key: "expression", label: "表現力", color: "#10b981" },
  { key: "apAlignment", label: "AP合致度", color: "#ef4444" },
  { key: "originality", label: "独自性", color: "#8b5cf6" },
] as const;

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
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SCORE_LINES.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
