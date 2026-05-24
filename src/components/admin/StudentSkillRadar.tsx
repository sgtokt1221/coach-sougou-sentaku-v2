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
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";

interface Props {
  detail: StudentDetail;
  skillCheck?: SkillCheckStatus | null;
  interviewSkillCheck?: InterviewSkillCheckStatus | null;
}

/**
 * 生徒スキルカード。 ユーザー仕様:
 * 「最初にスキルチェックテストを受け、 そこからは普段の取り組み + 再度の
 *  チェックテストで動的にランクが変化する合成スコア」 を可視化する。
 *
 * 表示:
 * - メインスコア = aggregate.compositeScore + compositeRank (= SC × 0.4 + 練習 × 0.6)
 * - 内訳: テスト (SC) + 練習 (直近 30 日履歴) の各スコア
 * - レーダー: 小論文は SC の 5 軸スコア (構成 / 論理性 / 表現力 / AP 合致 / 独自性)、
 *   面接は SC の 4 軸 (言語能力 / 論理能力 / 思考の深さ / 面接態度)。
 *   SC 未受験で aggregate.mode === "practice_only" なら履歴のカテゴリ平均 fallback
 *
 * 弱点改善率 / 直近 30 日活動量バッジはヘッダー右側で維持。
 */
export function StudentSkillRadar({
  detail,
  skillCheck,
  interviewSkillCheck,
}: Props) {
  const {
    essays,
    weaknesses,
    interviewScoreTrend,
    essayCategoryAverages,
    interviewCategoryAverages,
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
    (e) => new Date(e.submittedAt) > thirtyDaysAgo,
  ).length;
  const recentInterviewActivity = interviewScoreTrend
    ? interviewScoreTrend.filter((t) => new Date(t.date) > thirtyDaysAgo).length
    : 0;
  const totalRecentActivity = recentEssayActivity + recentInterviewActivity;

  // 小論文レーダー: SC latestResult の 5 軸を優先、 SC 未受験なら履歴 5 軸 fallback
  const essayLatest = skillCheck?.latestResult?.scores;
  const essayRadar = useMemo(() => {
    if (essayLatest) {
      return [
        { subject: "構成", value: essayLatest.structure ?? 0 },
        { subject: "論理性", value: essayLatest.logic ?? 0 },
        { subject: "表現力", value: essayLatest.expression ?? 0 },
        { subject: "AP合致度", value: essayLatest.apAlignment ?? 0 },
        { subject: "独自性", value: essayLatest.originality ?? 0 },
      ];
    }
    if (essayCategoryAverages) {
      return [
        { subject: "構成", value: essayCategoryAverages.structure ?? 0 },
        { subject: "論理性", value: essayCategoryAverages.logic ?? 0 },
        { subject: "表現力", value: essayCategoryAverages.expression ?? 0 },
        { subject: "AP合致度", value: essayCategoryAverages.apAlignment ?? 0 },
        { subject: "独自性", value: essayCategoryAverages.originality ?? 0 },
      ];
    }
    return null;
  }, [essayLatest, essayCategoryAverages]);
  const essayRadarSource = essayLatest ? "test" : "history";

  // 面接レーダー: SC 4 軸が優先、 SC 未受験なら履歴の 5 軸 fallback
  const interviewLatest = interviewSkillCheck?.latestResult?.scores;
  const interviewRadar = useMemo(() => {
    if (interviewLatest) {
      return [
        { subject: "言語能力", value: interviewLatest.verbal ?? 0 },
        { subject: "論理能力", value: interviewLatest.logical ?? 0 },
        { subject: "思考の深さ", value: interviewLatest.depth ?? 0 },
        { subject: "面接態度", value: interviewLatest.demeanor ?? 0 },
      ];
    }
    if (interviewCategoryAverages) {
      return [
        { subject: "明確さ", value: interviewCategoryAverages.clarity ?? 0 },
        { subject: "AP合致度", value: interviewCategoryAverages.apAlignment ?? 0 },
        { subject: "熱意", value: interviewCategoryAverages.enthusiasm ?? 0 },
        { subject: "具体性", value: interviewCategoryAverages.specificity ?? 0 },
        { subject: "ボディランゲージ", value: interviewCategoryAverages.bodyLanguage ?? 0 },
      ];
    }
    return null;
  }, [interviewLatest, interviewCategoryAverages]);
  const interviewRadarSource = interviewLatest ? "test" : "history";

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
            radarSource={essayRadarSource}
          />
          <SkillCard
            kind="interview"
            aggregate={interviewAggregate}
            maxScore={40}
            radar={interviewRadar}
            radarSource={interviewRadarSource}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}

/**
 * 小論文 / 面接 スキルカード本体。
 *
 * - aggregate なし / mode "none" → 「未受験」 表示のみ
 * - それ以外: メインスコア + 内訳 (テスト + 練習) + レーダー
 */
function SkillCard({
  kind,
  aggregate,
  maxScore,
  radar,
  radarSource,
}: {
  kind: "essay" | "interview";
  aggregate: AggregateBreakdown | undefined;
  maxScore: number;
  radar: { subject: string; value: number }[] | null;
  radarSource: "test" | "history";
}) {
  const isEssay = kind === "essay";
  const label = isEssay ? "小論文" : "面接";

  // 未受験 (aggregate なし or mode "none")
  if (!aggregate || aggregate.mode === "none" || aggregate.compositeRank === null) {
    return (
      <div
        className={`rounded-lg border p-4 ${
          isEssay
            ? "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30"
            : "border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {isEssay ? <FileText className="size-4" /> : <Mic className="size-4" />}
          {label}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          まだスキルチェックも履歴もありません
        </p>
      </div>
    );
  }

  const modeNote =
    aggregate.mode === "sc_only"
      ? "テストのみ (練習履歴なし)"
      : aggregate.mode === "practice_only"
        ? "練習のみ (テスト未受験 / 履歴から推定)"
        : "テスト + 練習の合成";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isEssay
          ? "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30"
          : "border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30"
      }`}
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
        <Badge variant="secondary" className="text-[10px]">
          {modeNote}
        </Badge>
      </div>

      {/* メインスコア: 合成ランク + composite score */}
      <div className="flex items-center gap-3">
        <SkillRankBadge
          rank={aggregate.compositeRank}
          size="lg"
          animate={false}
        />
        <div>
          <div className="text-3xl font-bold tabular-nums">
            {aggregate.compositeScore !== null
              ? aggregate.compositeScore.toFixed(1)
              : "—"}
            <span className="ml-1 text-sm text-muted-foreground">/{maxScore}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            総合スキル
          </div>
        </div>
      </div>

      {/* 内訳: テスト + 練習 */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-white/60 p-2 dark:bg-black/20">
          <div className="text-muted-foreground">テスト</div>
          <div className="mt-0.5 font-medium tabular-nums">
            {aggregate.scScore !== null ? (
              <>
                {aggregate.scScore}
                <span className="text-[10px] text-muted-foreground">
                  /{maxScore}
                </span>
                {aggregate.scRank && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {aggregate.scRank}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">未受験</span>
            )}
          </div>
        </div>
        <div className="rounded bg-white/60 p-2 dark:bg-black/20">
          <div className="text-muted-foreground">練習</div>
          <div className="mt-0.5 font-medium tabular-nums">
            {aggregate.practiceAvg !== null ? (
              <>
                {aggregate.practiceAvg.toFixed(1)}
                <span className="text-[10px] text-muted-foreground">
                  /{maxScore}
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {aggregate.practiceCount}件
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">履歴なし</span>
            )}
          </div>
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
      <p className="mt-2 text-[10px] text-muted-foreground">
        {radarSource === "test"
          ? "レーダー: 直近のスキルチェック結果"
          : "レーダー: 直近の練習履歴 (テスト未受験)"}
      </p>
    </div>
  );
}
