"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { SCORE_LINES, INTERVIEW_SCORE_LINES } from "@/components/charts/theme";

type ScoreLine = { key: string; label: string; color: string };

interface RadarBlockProps {
  title: string;
  count?: number;
  averages: Record<string, number>;
  lines: readonly ScoreLine[];
  color: string;
}

function RadarBlock({ title, count, averages, lines, color }: RadarBlockProps) {
  const data = lines.map((l) => ({
    subject: l.label,
    value: Number((averages[l.key] ?? 0).toFixed(1)),
  }));

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {typeof count === "number" && (
          <span className="text-[11px] text-muted-foreground">
            {count}件の平均
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid gridType="polygon" stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
        <ul className="space-y-1 text-xs sm:min-w-[120px]">
          {data.map((d) => (
            <li
              key={d.subject}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">{d.subject}</span>
              <span className="font-semibold tabular-nums">
                {d.value.toFixed(1)}/10
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * 日々の小論文・面接の提出から算出した項目別平均レーダー。
 * essayAverages / interviewAverages はそれぞれ各項目(0-10)の平均値。無いカードは出さない。
 */
export function CategoryAverageRadar({
  essayAverages,
  interviewAverages,
  essayCount,
  interviewCount,
}: {
  essayAverages?: Record<string, number>;
  interviewAverages?: Record<string, number>;
  essayCount?: number;
  interviewCount?: number;
}) {
  if (!essayAverages && !interviewAverages) return null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {essayAverages && (
        <RadarBlock
          title="小論文 項目別平均"
          count={essayCount}
          averages={essayAverages}
          lines={SCORE_LINES}
          color="var(--chart-1)"
        />
      )}
      {interviewAverages && (
        <RadarBlock
          title="面接 項目別平均"
          count={interviewCount}
          averages={interviewAverages}
          lines={INTERVIEW_SCORE_LINES}
          color="var(--chart-5)"
        />
      )}
    </div>
  );
}
