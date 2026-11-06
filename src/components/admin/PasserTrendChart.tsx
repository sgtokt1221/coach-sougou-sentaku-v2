"use client";

import {
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SCORE_TYPE_COLORS } from "@/components/charts/theme";
import { INTERVIEW_CONTENT_MAX } from "@/lib/types/interview";

type Point = { at: string; score: number };

const ESSAY_MAX = 50;

interface Row {
  t: number;
  essay?: number;
  interview?: number;
  essayScore?: number;
  interviewScore?: number;
}

/**
 * 合格者の小論文と面接の点の推移。横軸は日付、縦軸は満点に対する割合
 * （小論文50点・面接40点を同じ高さで比べるため）。破線は合格ライン。
 */
export function PasserTrendChart({
  essays,
  interviews,
  passLine,
  height = 96,
}: {
  essays: Point[];
  interviews: Point[];
  /** 合格ライン（50点換算） */
  passLine: number | null;
  height?: number;
}) {
  const rows: Row[] = [
    ...essays.map((p) => ({
      t: new Date(p.at).getTime(),
      essay: (p.score / ESSAY_MAX) * 100,
      essayScore: p.score,
    })),
    ...interviews.map((p) => ({
      t: new Date(p.at).getTime(),
      interview: (p.score / INTERVIEW_CONTENT_MAX) * 100,
      interviewScore: p.score,
    })),
  ].sort((a, b) => a.t - b.t);
  if (rows.length === 0) return null;
  const lastEssay = rows.findLastIndex((r) => r.essay !== undefined);
  const lastInterview = rows.findLastIndex((r) => r.interview !== undefined);
  const md = (t: number) =>
    new Date(t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });

  const endLabel = (lastIndex: number, text: string, color: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function EndLabel(props: any) {
      return props.index === lastIndex ? (
        <text x={props.x + 4} y={props.y - 6} fontSize={10} fontWeight={700} fill={color}>
          {text}
        </text>
      ) : null;
    };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 6, right: 40, left: 12, bottom: 0 }}>
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => `${new Date(t).getMonth() + 1}月`}
          ticks={[rows[0].t, rows[rows.length - 1].t]}
          tick={{ fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          height={14}
          interval={0}
        />
        <YAxis domain={[0, 100]} hide />
        {passLine !== null && (
          <ReferenceLine
            y={(passLine / ESSAY_MAX) * 100}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
        )}
        <Tooltip
          content={({ active, payload }) => {
            const r = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
            if (!r) return null;
            return (
              <div className="bg-popover rounded-md px-2 py-1 text-xs shadow">
                <p className="text-muted-foreground">{md(r.t)}</p>
                {r.essayScore !== undefined && (
                  <p>
                    小論文 <b>{r.essayScore}</b>/{ESSAY_MAX}
                  </p>
                )}
                {r.interviewScore !== undefined && (
                  <p>
                    面接 <b>{r.interviewScore}</b>/{INTERVIEW_CONTENT_MAX}
                  </p>
                )}
              </div>
            );
          }}
        />
        <Line
          dataKey="essay"
          stroke={SCORE_TYPE_COLORS.essay}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        >
          <LabelList content={endLabel(lastEssay, "小論文", SCORE_TYPE_COLORS.essay)} />
        </Line>
        <Line
          dataKey="interview"
          stroke={SCORE_TYPE_COLORS.interview}
          strokeWidth={2}
          dot={{ r: 3, fill: SCORE_TYPE_COLORS.interview, strokeWidth: 0 }}
          connectNulls
          isAnimationActive={false}
        >
          <LabelList content={endLabel(lastInterview, "面接", SCORE_TYPE_COLORS.interview)} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
