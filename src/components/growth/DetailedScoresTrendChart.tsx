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
import {
  EssayKindFilter,
  useEssayKindFilter,
} from "@/components/growth/EssayKindFilter";
import type { EssayKind } from "@/lib/essay/essay-kind";

interface TrendDataPoint {
  date: string;
  /** null は「その回は測っていない」。0 と区別して線を途切れさせる */
  [key: string]: number | string | null;
}

interface LineDef {
  key: string;
  label: string;
  color: string;
}

interface DetailedScoresTrendChartProps {
  data: TrendDataPoint[];
  /** 描画する系列。未指定は小論文5項目（SCORE_LINES） */
  lines?: readonly LineDef[];
}

export function DetailedScoresTrendChart({ data: allData, lines }: DetailedScoresTrendChartProps) {
  const lineDefs = lines ?? SCORE_LINES;
  // 小論文の点に種類があれば、種類で絞り込めるようにする（面接の点には無いので出ない）
  const kindFilter = useEssayKindFilter(allData as Array<TrendDataPoint & { kind?: EssayKind }>);
  const data = kindFilter.filtered;
  const filter = kindFilter.showFilter ? (
    <div className="mb-2 flex justify-end">
      <EssayKindFilter
        kinds={kindFilter.kinds}
        selected={kindFilter.selected}
        onChange={kindFilter.setSelected}
        counts={kindFilter.counts}
      />
    </div>
  ) : null;

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        まだデータがありません
      </div>
    );
  }

  // 1データ点の場合、前後にダミー点を追加して中央に表示
  const zero: Record<string, number> = Object.fromEntries(lineDefs.map((l) => [l.key, 0]));
  const chartData =
    data.length === 1
      ? [{ date: "", ...zero }, data[0], { date: " ", ...zero }]
      : data;

  return (
    <div>
      {filter}
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
          domain={[0, 10]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lineDefs.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4, fill: "white", strokeWidth: 2 }}
            activeDot={<CustomActiveDot />}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
