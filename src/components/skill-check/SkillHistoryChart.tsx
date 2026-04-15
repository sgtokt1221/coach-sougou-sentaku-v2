"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SkillCheckResult } from "@/lib/types/skill-check";

export function SkillHistoryChart({ history }: { history: SkillCheckResult[] }) {
  // 古い順に並び替え
  const ordered = [...history].reverse();
  const data = ordered.map((r, i) => ({
    idx: i + 1,
    date: new Date(r.takenAt).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    }),
    total: r.scores.total,
    rank: r.rank,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        まだ履歴がありません
      </div>
    );
  }

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 50]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value}/50`, "総合スコア"] as [string, string]}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
