"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { StudentDetail } from "@/lib/types/admin";
import { StatsSummaryCard } from "./ReportDetailCard";

interface Props {
  detail: StudentDetail;
}

/**
 * 生徒スキル俯瞰。 成長レポートの「StatsSummaryCard」 と同じ UI を流用し、
 * 小論文 / 面接の 2 枚を横並びで表示する。
 *
 * 表示要素 (各カード):
 * - 平均スコア + SkillRankBadge + 先期比
 * - 得意 / 課題 (essay のみ)
 * - レーダーチャート (5 軸) + 項目別スコアリスト
 *
 * 弱点改善率 / 直近 30 日活動量はヘッダー右側のバッジで残す。
 */
export function StudentSkillRadar({ detail }: Props) {
  const {
    essays,
    weaknesses,
    interviewScoreTrend,
    essayCategoryAverages,
    interviewCategoryAverages,
    essayStatsSummary,
    interviewStatsSummary,
  } = detail;

  // 弱点改善率
  const resolvedCount = weaknesses.filter((w) => w.resolved).length;
  const totalWeaknesses = weaknesses.length;
  const weaknessImprovementRate =
    totalWeaknesses > 0
      ? Math.round((resolvedCount / totalWeaknesses) * 100)
      : null;

  // 直近 30 日の活動量
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEssayActivity = essays.filter(
    (e) => new Date(e.submittedAt) > thirtyDaysAgo,
  ).length;
  const recentInterviewActivity = interviewScoreTrend
    ? interviewScoreTrend.filter((t) => new Date(t.date) > thirtyDaysAgo).length
    : 0;
  const totalRecentActivity = recentEssayActivity + recentInterviewActivity;

  // StatsSummaryCard に渡す stats (count > 0 のときだけカード描画)
  const essayStats = essayStatsSummary
    ? {
        ...essayStatsSummary,
        categoryAverages: essayCategoryAverages as
          | Record<string, number>
          | undefined,
      }
    : null;
  const interviewStats = interviewStatsSummary
    ? {
        ...interviewStatsSummary,
        categoryAverages: interviewCategoryAverages as
          | Record<string, number>
          | undefined,
      }
    : null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">スキル俯瞰</CardTitle>
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
          {essayStats ? (
            <StatsSummaryCard kind="essay" stats={essayStats} max={50} />
          ) : (
            <EmptyCard label="小論文" />
          )}
          {interviewStats ? (
            <StatsSummaryCard
              kind="interview"
              stats={interviewStats}
              max={40}
            />
          ) : (
            <EmptyCard label="面接" />
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
      <p className="mb-1 text-xs font-semibold">{label}</p>
      まだ受けていません
    </div>
  );
}
