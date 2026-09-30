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
import {
  CHART_COLORS,
  CHART_ANIMATION,
  ESSAY_KIND_COLORS,
  GRID_STYLE,
  SCORE_TYPE_COLORS,
} from "@/components/charts/theme";
import {
  ESSAY_KIND_LABELS,
  essayKindTotalKey,
  type EssayKind,
} from "@/lib/essay/essay-kind";
import {
  EssayKindFilter,
  useEssayKindFilter,
  withKindTotals,
} from "@/components/growth/EssayKindFilter";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomActiveDot } from "@/components/charts/CustomDot";

/**
 * 小論文と面接のスコアを別系列で描画できるようにしたトレンドチャート。
 *
 * 使い方:
 * - 既存 (後方互換): `data={[{date, total, ...}]}` — 1 本線で描画
 * - 新規 (推奨): `essayData=[...]` + `interviewData=[...]` — 2 本線で描画して凡例付き
 * - 両方とも total を使った時系列プロット。date はラベルに使う
 * - 小論文の点に kind（答案の種類）があれば、種類ごとに別の線で描き、
 *   種類が2つ以上なら「すべて／小論文／口頭試問／レポート」の切り替えを出す。
 *   口頭試問（専門知識込み）やレポートを小論文と同じ線につなぐと、種類が
 *   変わっただけの上下が実力の上下に見えるため。
 */

interface LegacyDataPoint {
  date: string;
  total: number;
  structure?: number;
  logic?: number;
  expression?: number;
  apAlignment?: number;
  responsiveness?: number;
  /** v23 で廃止した独自性。旧データの点だけ持つ */
  originality?: number;
}

interface SeriesPoint {
  date: string;
  total: number;
  /** 答案の種類（小論文の点だけ）。無ければ通常の小論文 */
  kind?: EssayKind;
  /** 並べ替えに使う時刻。無ければ date（"M/D"）で並べる */
  ts?: number;
}

interface ScoresTrendChartProps {
  /** 旧形式: 単一系列 */
  data?: LegacyDataPoint[];
  /** 小論文スコア系列 */
  essayData?: SeriesPoint[];
  /** 面接スコア系列 */
  interviewData?: SeriesPoint[];
  /** チャート高さ (px)。既定 280 */
  height?: number;
}

/** "M/D" を並べ替え用の数値にする（localeCompare だと "4/11" < "4/8" になる） */
function dateSortKey(s: string): number {
  const parts = s.split("/").map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return 0;
  return parts[0] * 100 + parts[1];
}

type Row = { date: string; interview?: number } & Partial<
  Record<`total_${EssayKind}`, number>
>;

/**
 * 小論文（種類ごとの系列）と面接を、1答案1行で時系列に並べる。
 * 以前は日付キーでまとめていたため、同じ日に2本書くと1点しか残らなかった。
 * 自分の系列にだけ値を持たせ、線は connectNulls で同じ系列どうしをつなぐ。
 */
function buildRows(essay: SeriesPoint[], interview: SeriesPoint[]): Row[] {
  // 時刻が1点でも欠けていたら全体を日付で並べる（ミリ秒と "M/D" を混ぜて比べない）
  const useTs = [...essay, ...interview].every((p) => Number.isFinite(p.ts));
  const keyOf = (p: SeriesPoint) => (useTs ? p.ts! : dateSortKey(p.date));
  const rows: Array<Row & { _key: number }> = [
    ...withKindTotals(essay).map((p) => {
      const { total: _t, kind: _k, ts: _ts, ...rest } = p;
      return { ...rest, _key: keyOf(p) };
    }),
    ...interview.map((p) => ({
      date: p.date,
      interview: p.total,
      _key: keyOf(p),
    })),
  ];
  return rows.sort((a, b) => a._key - b._key).map(({ _key: _, ...row }) => row);
}

export function ScoresTrendChart({
  data,
  essayData,
  interviewData,
  height = 280,
}: ScoresTrendChartProps) {
  const isCombined = essayData != null || interviewData != null;
  const kindFilter = useEssayKindFilter(essayData ?? []);

  // 2 系列モード
  if (isCombined) {
    const showInterview = kindFilter.selected === "all";
    const merged = buildRows(
      kindFilter.filtered,
      showInterview ? (interviewData ?? []) : []
    );
    // 種類が1つだけなら、これまでどおり「小論文」1本の線として出す
    // 切り替えの段の分だけグラフを低くする。親が高さを固定していると凡例が切れる
    const chartHeight = kindFilter.showFilter ? height - 44 : height;
    const essayKinds: EssayKind[] =
      kindFilter.selected === "all" ? kindFilter.kinds : [kindFilter.selected];
    if (merged.length === 0) {
      return (
        <div
          className="text-muted-foreground flex items-center justify-center text-sm"
          style={{ height }}
        >
          まだデータがありません
        </div>
      );
    }
    return (
      <div>
        {kindFilter.showFilter && (
          <div className="mb-2 flex justify-end">
            <EssayKindFilter
              kinds={kindFilter.kinds}
              selected={kindFilter.selected}
              onChange={kindFilter.setSelected}
              counts={kindFilter.counts}
            />
          </div>
        )}
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={merged}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
            />
            {essayKinds.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={essayKindTotalKey(k)}
                name={ESSAY_KIND_LABELS[k]}
                stroke={ESSAY_KIND_COLORS[k]}
                strokeWidth={2.5}
                dot={{
                  r: 5,
                  fill: "white",
                  stroke: ESSAY_KIND_COLORS[k],
                  strokeWidth: 2,
                }}
                activeDot={<CustomActiveDot />}
                // 他の種類の点をまたいで、同じ種類どうしをつなぐ
                connectNulls
                isAnimationActive
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
            ))}
            {showInterview && (interviewData?.length ?? 0) > 0 && (
              <Line
                type="monotone"
                dataKey="interview"
                name="面接"
                stroke={SCORE_TYPE_COLORS.interview}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{
                  r: 5,
                  fill: "white",
                  stroke: SCORE_TYPE_COLORS.interview,
                  strokeWidth: 2,
                }}
                activeDot={<CustomActiveDot />}
                connectNulls
                isAnimationActive
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 1 系列モード (後方互換)
  const single = data ?? [];
  if (single.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center text-sm"
        style={{ height }}
      >
        まだデータがありません
      </div>
    );
  }

  // 1データ点の場合、前後にダミー点を追加して中央に表示
  const chartData =
    single.length === 1
      ? [
          { ...single[0], date: "", total: null },
          single[0],
          { ...single[0], date: " ", total: null },
        ]
      : single;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
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
          dot={{
            r: 5,
            fill: "white",
            stroke: CHART_COLORS.primary,
            strokeWidth: 2,
          }}
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
