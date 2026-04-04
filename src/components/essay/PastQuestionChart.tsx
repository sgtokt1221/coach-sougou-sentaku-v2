"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";

interface ChartDef {
  type: "bar" | "line" | "pie";
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKeys: { key: string; name: string; color: string }[];
}

const PIE_COLORS = [
  "oklch(var(--chart-1))", "oklch(var(--chart-2))", "oklch(var(--chart-3))",
  "oklch(var(--chart-4))", "oklch(var(--chart-5))",
  "oklch(var(--chart-1) / 0.7)", "oklch(var(--chart-2) / 0.7)", "oklch(var(--chart-3) / 0.7)",
  "oklch(var(--chart-4) / 0.7)", "oklch(var(--chart-5) / 0.7)",
];

export function PastQuestionChart({ charts }: { charts: ChartDef[] }) {
  return (
    <div className="space-y-4">
      {charts.map((chart, idx) => (
        <div key={idx} className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold mb-3">{chart.title}</p>

          {chart.type === "bar" && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} opacity={GRID_STYLE.opacity} />
                <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {chart.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                {chart.yKeys.map((yk) => (
                  <Bar key={yk.key} dataKey={yk.key} name={yk.name} fill={yk.color} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {chart.type === "line" && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} opacity={GRID_STYLE.opacity} />
                <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chart.yKeys.map((yk) => (
                  <Line key={yk.key} type="monotone" dataKey={yk.key} name={yk.name} stroke={yk.color} strokeWidth={2} dot={<CustomDot />} activeDot={<CustomActiveDot />} isAnimationActive={true} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {chart.type === "pie" && (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey={chart.xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} ${value ?? 0}%`}
                  labelLine={{ strokeWidth: 1 }}
                  isAnimationActive={true}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                >
                  {chart.data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}
    </div>
  );
}
