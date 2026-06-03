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
import { FileText, Mic, RefreshCw, Calendar } from "lucide-react";
import type { StudentDetail } from "@/lib/types/admin";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";

interface Props {
  detail: StudentDetail;
  skillCheck?: SkillCheckStatus | null;
  interviewSkillCheck?: InterviewSkillCheckStatus | null;
  /** 小論文スキルカードのクリック (最新スキルチェック詳細を開く) */
  onSelectEssay?: () => void;
  /** 面接スキルカードのクリック */
  onSelectInterview?: () => void;
}

type SkillCheckMeta = {
  takenAt: string;
  daysSinceLast: number;
  needsRefresh: boolean;
};

/**
 * 生徒スキルカード。 仕様:
 * 「スキル = 最新のスキルチェックテスト結果のみ」 (月 1 リマインド再受験)
 *
 * 練習履歴は合成に含めず、 SC 単独で動的に変化させる。
 * 30 日経過で needsRefresh = true → 再受験推奨バッジを表示。
 */
export function StudentSkillRadar({
  detail,
  skillCheck,
  interviewSkillCheck,
  onSelectEssay,
  onSelectInterview,
}: Props) {
  const {
    essays,
    weaknesses,
    interviewScoreTrend,
    essayAggregate,
    interviewAggregate,
    essaySkillCheckMeta,
    interviewSkillCheckMeta,
  } = detail;

  const resolvedCount = weaknesses.filter((w) => w.resolved).length;
  const totalWeaknesses = weaknesses.length;
  const weaknessImprovementRate =
    totalWeaknesses > 0
      ? Math.round((resolvedCount / totalWeaknesses) * 100)
      : null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEssayActivity = essays.filter(
    (e) => new Date(e.submittedAt) > thirtyDaysAgo,
  ).length;
  const recentInterviewActivity = interviewScoreTrend
    ? interviewScoreTrend.filter((t) => new Date(t.date) > thirtyDaysAgo).length
    : 0;
  const totalRecentActivity = recentEssayActivity + recentInterviewActivity;

  // レーダー: SC latestResult のカテゴリ別スコア (essay 5 軸 / interview 4 軸)
  const essayLatest = skillCheck?.latestResult?.scores;
  const essayRadar = useMemo(() => {
    if (!essayLatest) return null;
    return [
      { subject: "構成", value: essayLatest.structure ?? 0 },
      { subject: "論理性", value: essayLatest.logic ?? 0 },
      { subject: "表現力", value: essayLatest.expression ?? 0 },
      { subject: "AP合致度", value: essayLatest.apAlignment ?? 0 },
      { subject: "独自性", value: essayLatest.originality ?? 0 },
    ];
  }, [essayLatest]);

  const interviewLatest = interviewSkillCheck?.latestResult?.scores;
  const interviewRadar = useMemo(() => {
    if (!interviewLatest) return null;
    return [
      { subject: "言語能力", value: interviewLatest.verbal ?? 0 },
      { subject: "論理能力", value: interviewLatest.logical ?? 0 },
      { subject: "思考の深さ", value: interviewLatest.depth ?? 0 },
      { subject: "面接態度", value: interviewLatest.demeanor ?? 0 },
    ];
  }, [interviewLatest]);

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
            meta={essaySkillCheckMeta}
            maxScore={50}
            radar={essayRadar}
            onClick={skillCheck?.latestResult ? onSelectEssay : undefined}
          />
          <SkillCard
            kind="interview"
            aggregate={interviewAggregate}
            meta={interviewSkillCheckMeta}
            maxScore={40}
            radar={interviewRadar}
            onClick={interviewSkillCheck?.latestResult ? onSelectInterview : undefined}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}

/**
 * 小論文 / 面接 スキルカード本体 (SC 専用)。
 *
 * - aggregate.mode === "none" → 「未受験」 メッセージ + 受験促し
 * - それ以外 → SC ランク + スコア + 受験日 + リマインドバッジ + レーダー
 */
function SkillCard({
  kind,
  aggregate,
  meta,
  maxScore,
  radar,
  onClick,
}: {
  kind: "essay" | "interview";
  aggregate: AggregateBreakdown | undefined;
  meta: SkillCheckMeta | undefined;
  maxScore: number;
  radar: { subject: string; value: number }[] | null;
  onClick?: () => void;
}) {
  const isEssay = kind === "essay";
  const label = isEssay ? "小論文" : "面接";
  const bgClass = isEssay
    ? "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30"
    : "border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30";

  // 未受験
  if (!aggregate || aggregate.mode === "none" || aggregate.compositeRank === null) {
    return (
      <div className={`rounded-lg border p-4 ${bgClass}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {isEssay ? <FileText className="size-4" /> : <Mic className="size-4" />}
          {label}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          スキルチェックテストを受けるとランクが付きます。
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          月 1 回の受験でスキルを最新に保ちましょう。
        </p>
      </div>
    );
  }

  const takenAtDate = meta?.takenAt ? new Date(meta.takenAt) : null;
  const takenAtLabel = takenAtDate
    ? `${takenAtDate.getFullYear()}/${String(takenAtDate.getMonth() + 1).padStart(2, "0")}/${String(takenAtDate.getDate()).padStart(2, "0")} 受験`
    : null;

  return (
    <div
      className={`rounded-lg border p-4 ${bgClass} ${
        onClick
          ? "cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          : ""
      }`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div
          className={`flex items-center gap-2 text-sm font-semibold ${
            isEssay
              ? "text-teal-700 dark:text-teal-300"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {isEssay ? <FileText className="size-4" /> : <Mic className="size-4" />}
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          {meta?.needsRefresh && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <RefreshCw className="size-3" />
              再受験推奨 ({meta.daysSinceLast}日経過)
            </Badge>
          )}
          {onClick && (
            <span className="text-[10px] text-muted-foreground">詳細 ›</span>
          )}
        </div>
      </div>

      {/* メインスコア + ランク */}
      <div className="flex items-center gap-3">
        <SkillRankBadge
          rank={aggregate.compositeRank}
          size="lg"
          animate={false}
        />
        <div>
          <div className="text-3xl font-bold tabular-nums">
            {aggregate.compositeScore !== null
              ? aggregate.compositeScore
              : "—"}
            <span className="ml-1 text-sm text-muted-foreground">
              /{maxScore}
            </span>
          </div>
          {takenAtLabel && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="size-3" />
              {takenAtLabel}
            </div>
          )}
        </div>
      </div>

      {/* レーダーチャート */}
      {radar && radar.some((r) => r.value > 0) && (
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="mx-auto h-[200px] w-full max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="75%">
                <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#475569", fontSize: 10 }}
                />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
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
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
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
