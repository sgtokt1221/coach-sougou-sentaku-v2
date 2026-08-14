"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { EssayScores } from "@/lib/types/essay";

export function SkillRadarChart({
  scores,
  apAxisLabel = "系統適合",
  showAp = true,
  showMaturity = false,
  height = 260,
}: {
  scores: EssayScores;
  /** AP軸の表示名。スキルチェックは「系統適合」、小論文添削は「AP合致」 */
  apAxisLabel?: string;
  /** APが取得できず評価できなかった答案では軸ごと外す（0点に見えるのを避ける） */
  showAp?: boolean;
  /**
   * 議論の成熟度を軸に加える。小論文添削(v7以降)だけが持つ軸で、
   * スキルチェックのスコアには存在しない。
   */
  showMaturity?: boolean;
  height?: number;
}) {
  const data = [
    { axis: "構成", score: scores.structure, fullMark: 10 },
    { axis: "論理", score: scores.logic, fullMark: 10 },
    { axis: "表現", score: scores.expression, fullMark: 10 },
    ...(showAp
      ? [{ axis: apAxisLabel, score: scores.apAlignment, fullMark: 10 }]
      : []),
    { axis: "独自性", score: scores.originality, fullMark: 10 },
    // 旧データには無いので、値があるときだけ描く（0 として凹ませない）
    ...(showMaturity && typeof scores.reasoningMaturity === "number"
      ? [{ axis: "成熟度", score: scores.reasoningMaturity, fullMark: 10 }]
      : []),
  ];
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
          <Radar
            name="スコア"
            dataKey="score"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
