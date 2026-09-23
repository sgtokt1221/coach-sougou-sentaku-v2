"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { FileText, Mic } from "lucide-react";
import type { StudentDetail } from "@/lib/types/admin";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";
import type {
  EssayAxisAverages,
  InterviewAxisAverages,
} from "@/lib/admin/axis-averages";
import { SCORE_LINES, INTERVIEW_SCORE_LINES } from "@/components/charts/theme";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";

interface Props {
  detail: StudentDetail;
  /** 小論文の項目別平均（全提出）。computeAxisAverages の値 */
  essayAxisAvg?: EssayAxisAverages;
  /** 面接の項目別平均（全提出） */
  interviewAxisAvg?: InterviewAxisAverages;
}

type RadarPoint = { subject: string; value: number };

/**
 * 項目別平均をレーダー用の点にする。未評価(null)の軸は描かない
 * （0 として描くと最低評価に見える）。平均が無ければ null。
 */
function toRadar(
  averages: Record<string, number | null> | undefined,
  lines: readonly { key: string; label: string }[]
): RadarPoint[] | null {
  if (!averages) return null;
  const points = lines
    .filter((l) => typeof averages[l.key] === "number")
    .map((l) => ({ subject: l.label, value: averages[l.key] as number }));
  return points.length > 0 ? points : null;
}

/**
 * 生徒スキルカード。ランクは提出（練習）の直近平均から出す。
 * レーダーは全提出の項目別平均。
 */
export function StudentSkillRadar({
  detail,
  essayAxisAvg,
  interviewAxisAvg,
}: Props) {
  const {
    essays,
    weaknesses,
    interviewScoreTrend,
    essayAggregate,
    interviewAggregate,
  } = detail;

  const resolvedCount = weaknesses.filter((w) => w.resolved).length;
  const totalWeaknesses = weaknesses.length;
  const weaknessImprovementRate =
    totalWeaknesses > 0
      ? Math.round((resolvedCount / totalWeaknesses) * 100)
      : null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEssayActivity = essays.filter(
    (e) => new Date(e.submittedAt) > thirtyDaysAgo
  ).length;
  const recentInterviewActivity = interviewScoreTrend
    ? interviewScoreTrend.filter((t) => new Date(t.date) > thirtyDaysAgo).length
    : 0;
  const totalRecentActivity = recentEssayActivity + recentInterviewActivity;

  // レーダー: 提出の項目別平均。小論文は合計に入る5軸のみ（APは合計外なので混ぜない）
  const essayRadar = useMemo(
    () => toRadar(essayAxisAvg, SCORE_LINES),
    [essayAxisAvg]
  );
  const interviewRadar = useMemo(
    () => toRadar(interviewAxisAvg, INTERVIEW_SCORE_LINES),
    [interviewAxisAvg]
  );

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">スキル</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {weaknessImprovementRate !== null && (
            <Badge variant="outline" className="text-[10px]">
              弱点改善 {weaknessImprovementRate}%
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            活動量 (30日) {totalRecentActivity}件
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          <SkillCard
            kind="essay"
            aggregate={essayAggregate}
            maxScore={50}
            radar={essayRadar}
          />
          <SkillCard
            kind="interview"
            aggregate={interviewAggregate}
            maxScore={40}
            radar={interviewRadar}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}

/**
 * 小論文 / 面接 スキルカード本体。
 *
 * - aggregate.mode === "none" → 未提出メッセージ
 * - それ以外 → ランク + スコア + 何件の平均か + レーダー（平均があるときだけ）
 */
function SkillCard({
  kind,
  aggregate,
  maxScore,
  radar,
}: {
  kind: "essay" | "interview";
  aggregate: AggregateBreakdown | undefined;
  maxScore: number;
  radar: RadarPoint[] | null;
}) {
  const isEssay = kind === "essay";
  const label = isEssay ? "小論文" : "面接";
  const bgClass = isEssay
    ? "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30"
    : "border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30";

  if (
    !aggregate ||
    aggregate.mode === "none" ||
    aggregate.compositeRank === null
  ) {
    return (
      <div className={`rounded-lg border p-4 ${bgClass}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {isEssay ? (
            <FileText className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
          {label}
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          提出するとランクが付きます
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${bgClass}`}>
      <div
        className={`mb-2 flex items-center gap-2 text-sm font-semibold ${
          isEssay
            ? "text-teal-700 dark:text-teal-300"
            : "text-rose-700 dark:text-rose-300"
        }`}
      >
        {isEssay ? <FileText className="size-4" /> : <Mic className="size-4" />}
        {label}
      </div>

      {/* メインスコア + ランク */}
      <div className="flex items-center gap-3">
        <SkillRankBadge
          rank={aggregate.compositeRank}
          size="lg"
          animate={false}
        />
        <div className="text-3xl font-bold tabular-nums">
          {aggregate.compositeScore !== null ? aggregate.compositeScore : "—"}
          <span className="text-muted-foreground ml-1 text-sm">
            /{maxScore}
          </span>
        </div>
      </div>

      {/* 何からランクが出ているか。生徒画面(SkillRankPanel)と同じ表記 */}
      {aggregate.mode === "practice_only" && (
        <p className="text-muted-foreground mt-2 text-sm">
          直近{aggregate.practiceCount}件の平均
        </p>
      )}

      {/* レーダーチャート */}
      {radar && radar.some((r) => r.value > 0) && (
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          {/* 軸名（「議論の成熟度」など）が枠で切れないよう、幅に余裕を取り半径を抑える */}
          <div className="mx-auto h-[200px] w-full max-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="62%">
                <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#475569", fontSize: 10 }}
                />
                <PolarRadiusAxis
                  domain={[0, 10]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke={isEssay ? "#0d9488" : "#e11d48"}
                  fill={isEssay ? "#14b8a6" : "#fb7185"}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-[110px] space-y-1 text-xs">
            {radar.map((item) => (
              <li
                key={item.subject}
                className="flex items-center justify-between gap-2 rounded bg-white/60 px-2 py-1 dark:bg-black/20"
              >
                <span className="text-muted-foreground">{item.subject}</span>
                <span className="font-medium tabular-nums">
                  {item.value.toFixed(1)}
                  <span className="text-muted-foreground ml-0.5 text-[10px]">
                    /10
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
