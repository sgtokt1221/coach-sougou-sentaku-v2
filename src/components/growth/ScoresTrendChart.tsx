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
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE, SCORE_TYPE_COLORS } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomActiveDot } from "@/components/charts/CustomDot";

/**
 * 小論文と面接のスコアを別系列で描画できるようにしたトレンドチャート。
 *
 * 使い方:
 * - 既存 (後方互換): `data={[{date, total, ...}]}` — 1 本線で描画
 * - 新規 (推奨): `essayData=[...]` + `interviewData=[...]` — 2 本線で描画して凡例付き
 * - 両方とも total を使った時系列プロット。date はラベルに使う
 */

interface LegacyDataPoint {
  date: string;
  total: number;
  structure?: number;
  logic?: number;
  expression?: number;
  apAlignment?: number;
  originality?: number;
}

interface SeriesPoint {
  date: string;
  total: number;
}

interface ScoresTrendChartProps {
  /** 旧形式: 単一系列 */
  data?: LegacyDataPoint[];
  /** 小論文スコア系列 */
  essayData?: SeriesPoint[];
  /** 面接スコア系列 */
  interviewData?: SeriesPoint[];
}

/**
 * 2 系列を日付キーでマージして Recharts 用データにする。
 * 同じ日にどちらかしかない場合は undefined (connectNulls=false なので線が途切れる)。
 */
function mergeSeries(
  essay: SeriesPoint[],
  interview: SeriesPoint[],
): Array<{ date: string; essay?: number; interview?: number }> {
  const byDate = new Map<string, { date: string; essay?: number; interview?: number }>();
  const upsert = (date: string) => {
    if (!byDate.has(date)) byDate.set(date, { date });
    return byDate.get(date)!;
  };
  essay.forEach((p) => {
    upsert(p.date).essay = p.total;
  });
  interview.forEach((p) => {
    upsert(p.date).interview = p.total;
  });
  // 元々の並び順 (essay→interview の結合順) を維持したいが、表示順は時系列にしたい
  // data 入力時点で時系列ソート済みと仮定せず、ここでもソートする
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function ScoresTrendChart({ data, essayData, interviewData }: ScoresTrendChartProps) {
  const isCombined = essayData != null || interviewData != null;

  // 2 系列モード
  if (isCombined) {
    const merged = mergeSeries(essayData ?? [], interviewData ?? []);
    if (merged.length === 0) {
      return (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          まだデータがありません
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={merged} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            opacity={GRID_STYLE.opacity}
          />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 50]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="essay"
            name="小論文"
            stroke={SCORE_TYPE_COLORS.essay}
            strokeWidth={2.5}
            dot={{ r: 5, fill: "white", stroke: SCORE_TYPE_COLORS.essay, strokeWidth: 2 }}
            activeDot={<CustomActiveDot />}
            connectNulls={false}
            isAnimationActive
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
          <Line
            type="monotone"
            dataKey="interview"
            name="面接"
            stroke={SCORE_TYPE_COLORS.interview}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 5, fill: "white", stroke: SCORE_TYPE_COLORS.interview, strokeWidth: 2 }}
            activeDot={<CustomActiveDot />}
            connectNulls={false}
            isAnimationActive
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // 1 系列モード (後方互換)
  const single = data ?? [];
  if (single.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        まだデータがありません
      </div>
    );
  }

  // 1データ点の場合、前後にダミー点を追加して中央に表示
  const chartData = single.length === 1
    ? [{ ...single[0], date: "", total: null }, single[0], { ...single[0], date: " ", total: null }]
    : single;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray={GRID_STYLE.strokeDasharray}
          stroke={GRID_STYLE.stroke}
          opacity={GRID_STYLE.opacity}
        />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 50]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
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
          isAnimationActive
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
