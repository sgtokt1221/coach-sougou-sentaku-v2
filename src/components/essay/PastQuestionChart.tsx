"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ChartDef {
  type: "bar" | "line" | "pie";
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKeys: { key: string; name: string; color: string }[];
}

const PIE_COLORS = [
  "#6366F1", "#374151", "#F59E0B", "#FBBF24", "#3B82F6",
  "#10B981", "#34D399", "#9CA3AF", "#EF4444", "#8B5CF6",
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {chart.yKeys.length > 1 && <Legend />}
                {chart.yKeys.map((yk) => (
                  <Bar key={yk.key} dataKey={yk.key} name={yk.name} fill={yk.color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {chart.type === "line" && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {chart.yKeys.map((yk) => (
                  <Line key={yk.key} type="monotone" dataKey={yk.key} name={yk.name} stroke={yk.color} strokeWidth={2} dot={{ r: 4 }} />
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
                >
                  {chart.data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}
    </div>
  );
}
