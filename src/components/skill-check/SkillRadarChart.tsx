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
import { essayScoreAxisRows } from "@/lib/essay/score-axes";

/**
 * 合計に入る5軸のレーダー。小論文添削・スキルチェックで共用する。
 *
 * AP合致度（スキルチェックの旧「系統適合」）は描かない。合計に1点も
 * 入らないため、五角形に混ぜると合計を構成する軸と同じ重みに見える。
 * 数値は呼び出し側の一覧に「合計外」として出す。
 *
 * 軸の並びと旧データの扱い（v22以前は回答力でなく独自性）は
 * essayScoreAxisRows に任せる。ここで軸名を手書きしない。
 */
export function SkillRadarChart({
  scores,
  height = 260,
}: {
  scores: EssayScores;
  height?: number;
}) {
  const data = essayScoreAxisRows(scores).map((row) => ({
    axis: row.short,
    score: row.value,
    fullMark: 10,
  }));
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
          {/* angle を省くと目盛りの軸が右向き(0度)になり、Recharts が数字を 90-angle 度回して横倒しで出す。
              上向き(90度)にして数字を立て、目盛りは2点刻みに揃える */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tickCount={6}
            tick={{ fontSize: 10 }}
          />
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
