"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Mic } from "lucide-react";
import { motion } from "framer-motion";
import type { StudentDetail } from "@/lib/types/admin";

interface Props {
  detail: StudentDetail;
}

/**
 * 生徒スキル俯瞰。
 * 小論文 5 軸 (構成 / 論証 / 表現力 / AP合致 / 独自性) と
 * 面接 5 軸 (明確さ / AP合致 / 熱意 / 具体性 / ボディランゲージ) を
 * 2 枚レーダーで並列表示。 弱点改善率と直近 30 日の活動量はサマリーバッジで残す。
 */
export function StudentSkillRadar({ detail }: Props) {
  const {
    essays,
    weaknesses,
    interviewScoreTrend,
    essayCategoryAverages,
    interviewCategoryAverages,
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

  const essayRadarData = essayCategoryAverages
    ? [
        { axis: "構成", value: essayCategoryAverages.structure },
        { axis: "論証", value: essayCategoryAverages.logic },
        { axis: "表現力", value: essayCategoryAverages.expression },
        { axis: "AP合致", value: essayCategoryAverages.apAlignment },
        { axis: "独自性", value: essayCategoryAverages.originality },
      ]
    : null;

  const interviewRadarData = interviewCategoryAverages
    ? [
        { axis: "明確さ", value: interviewCategoryAverages.clarity },
        { axis: "AP合致", value: interviewCategoryAverages.apAlignment },
        { axis: "熱意", value: interviewCategoryAverages.enthusiasm },
        { axis: "具体性", value: interviewCategoryAverages.specificity },
        { axis: "ボディ", value: interviewCategoryAverages.bodyLanguage },
      ]
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
          <RadarCard
            label="小論文スキル"
            icon={<FileText className="size-4" />}
            stroke="#0d9488"
            fill="#14b8a6"
            data={essayRadarData}
            emptyMessage="まだ受けていません"
          />
          <RadarCard
            label="面接スキル"
            icon={<Mic className="size-4" />}
            stroke="#e11d48"
            fill="#fb7185"
            data={interviewRadarData}
            emptyMessage="まだ受けていません"
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}

function RadarCard({
  label,
  icon,
  stroke,
  fill,
  data,
  emptyMessage,
}: {
  label: string;
  icon: React.ReactNode;
  stroke: string;
  fill: string;
  data: { axis: string; value: number }[] | null;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      {data ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="75%">
              <PolarGrid gridType="polygon" stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "#475569", fontSize: 10 }}
              />
              <PolarRadiusAxis
                domain={[0, 10]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="value"
                stroke={stroke}
                fill={fill}
                fillOpacity={0.25}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
