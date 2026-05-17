"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentDetail } from "@/lib/types/admin";
import { motion } from "framer-motion";

interface Props {
  detail: StudentDetail;
}

/**
 * 生徒スキル俯瞰の 5 軸レーダーチャート (0-100)。
 * 軸: 構成力 / 論証力 / AP合致 / 弱点改善 / 活動量
 */
export function StudentSkillRadar({ detail }: Props) {
  // 5 軸の集計
  const data = (() => {
    const { essays, weaknesses, lastActivityAt, essayScoreTrend, interviewScoreTrend } = detail;

    // 1. 構成力: essays の scores.structure 平均 (直近 3 件)
    const recentEssays = essays.filter(e => e.scores).slice(0, 3);
    const structureAvg = recentEssays.length > 0
      ? recentEssays.reduce((sum, e) => sum + e.scores!.structure, 0) / recentEssays.length
      : 0;
    const structureScore = Math.round(structureAvg * 10); // 0-10 → 0-100

    // 2. 論証力: essays の scores.logic 平均 (直近 3 件)
    const logicAvg = recentEssays.length > 0
      ? recentEssays.reduce((sum, e) => sum + e.scores!.logic, 0) / recentEssays.length
      : 0;
    const logicScore = Math.round(logicAvg * 10); // 0-10 → 0-100

    // 3. AP合致: essays の scores.apAlignment 平均、なければ interviewScoreTrend の合致度を推定
    const apAlignmentAvg = recentEssays.length > 0
      ? recentEssays.reduce((sum, e) => sum + e.scores!.apAlignment, 0) / recentEssays.length
      : (interviewScoreTrend && interviewScoreTrend.length > 0
         ? interviewScoreTrend[interviewScoreTrend.length - 1].total / 40 * 10 // 0-40 → 0-10 推定
         : 0);
    const apFitScore = Math.round(apAlignmentAvg * 10); // 0-10 → 0-100

    // 4. 弱点改善: 解決済み弱点 / 総弱点 * 100
    const resolvedCount = weaknesses.filter(w => w.resolved).length;
    const totalWeaknesses = weaknesses.length;
    const weaknessImprovementScore = totalWeaknesses > 0
      ? Math.round((resolvedCount / totalWeaknesses) * 100)
      : 50; // 弱点なしの場合は中央値

    // 5. 活動量: 直近 30 日活動を正規化
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEssayActivity = essays.filter(e => new Date(e.submittedAt) > thirtyDaysAgo).length;
    const recentInterviewActivity = interviewScoreTrend
      ? interviewScoreTrend.filter(t => new Date(t.date) > thirtyDaysAgo).length
      : 0;
    const totalRecentActivity = recentEssayActivity + recentInterviewActivity;
    const activityScore = Math.min(Math.round((totalRecentActivity / 30) * 100), 100);

    return [
      { axis: "構成力", value: structureScore },
      { axis: "論証力", value: logicScore },
      { axis: "AP合致", value: apFitScore },
      { axis: "弱点改善", value: weaknessImprovementScore },
      { axis: "活動量", value: activityScore },
    ];
  })();

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">スキル俯瞰</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-[260px]">
            <ResponsiveContainer>
              <RadarChart data={data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}