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

/**
 * 合計に入る5軸のレーダー。小論文添削・スキルチェックで共用する。
 *
 * AP合致度（スキルチェックの旧「系統適合」）は描かない。合計に1点も
 * 入らないため、五角形に混ぜると合計を構成する軸と同じ重みに見える。
 * 数値は呼び出し側の一覧に「合計外」として出す。
 */
export function SkillRadarChart({
  scores,
  height = 260,
}: {
  scores: EssayScores;
  height?: number;
}) {
  const data = [
    { axis: "構成", score: scores.structure, fullMark: 10 },
    { axis: "論理", score: scores.logic, fullMark: 10 },
    { axis: "表現", score: scores.expression, fullMark: 10 },
    { axis: "独自性", score: scores.originality, fullMark: 10 },
    // 旧データには無いので、値があるときだけ描く（0 として凹ませない）
    ...(typeof scores.reasoningMaturity === "number"
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
