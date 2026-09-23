"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  ExternalLink,
  School,
  GraduationCap,
  TrendingUp,
  BarChart3,
  FileText,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { CategoryAverageRadar } from "@/components/admin/CategoryAverageRadar";
import { WeaknessTopChart } from "@/components/admin/WeaknessTopChart";
import { StudentSkillRadar } from "@/components/admin/StudentSkillRadar";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { SummaryDrillsSection } from "@/components/admin/SummaryDrillsSection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";
import { SessionsHistorySection } from "@/components/admin/SessionsHistorySection";
import { ExamResultsSection } from "@/components/admin/ExamResultsSection";
import { AiConversationsSection } from "@/components/admin/AiConversationsSection";
import { HomeworkStatusSection } from "@/components/admin/HomeworkStatusSection";
import { CoachMemo } from "@/components/admin/CoachMemo";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import { getDisplayGrade } from "@/lib/utils/grade";
import type { StudentDetail } from "@/lib/types/admin";
import { computeAxisAverages } from "@/lib/admin/axis-averages";

type DossierTab =
  | "overview"
  | "performance"
  | "activity"
  | "homework"
  | "memos";

/** 満点に対する割合で色分けする（口頭試問型は60点満点） */
function scoreColor(total: number, max = 50): string {
  const pct = max > 0 ? (total / max) * 100 : 0;
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/**
 * セッション詳細内で生徒詳細ページ相当の情報にアクセスできる常時展開タブパネル。
 * 重いセクションは studentId だけで自己完結する既存コンポーネントを再利用する。
 * (ヒートマップ・自己分析は本パネルではスコープ外)
 */
export function SessionStudentDossier({
  studentId,
  detail,
}: {
  studentId: string;
  detail: StudentDetail;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");
  const { essayAxisAvg, interviewAxisAvg } = computeAxisAverages(detail);

  const { profile, weaknesses, essays, essayScoreTrend, interviewScoreTrend } =
    detail;

  const essayChartData = (essayScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));
  const interviewChartData = (interviewScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            生徒情報: {profile.displayName}
          </CardTitle>
          <Link href={`/admin/students/${studentId}`}>
            <Button variant="outline" size="sm">
              詳細ページ
              <ExternalLink className="ml-1 size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SegmentControl
            value={activeTab}
            onChange={(v) => setActiveTab(v as DossierTab)}
            options={[
              { id: "overview", label: "概要" },
              { id: "performance", label: "成績・弱点", accent: "violet" },
              { id: "activity", label: "活動・書類", accent: "amber" },
              { id: "homework", label: "宿題", accent: "rose" },
              { id: "memos", label: "メモ", accent: "emerald" },
            ]}
            fullWidth
          />

          {/* 概要 */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* プロフィール要約 */}
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {profile.school && (
                  <div className="flex items-center gap-2">
                    <School className="text-muted-foreground size-4" />
                    <span>{profile.school}</span>
                  </div>
                )}
                {(profile.grade != null || profile.isRonin) && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="text-muted-foreground size-4" />
                    <span>
                      {
                        getDisplayGrade(
                          profile.grade,
                          profile.gradeUpdatedAt,
                          profile.isRonin
                        ).label
                      }
                    </span>
                  </div>
                )}
                {typeof profile.gpa === "number" && (
                  <div className="flex items-center gap-2">
                    <Award className="text-muted-foreground size-4" />
                    <span>GPA {profile.gpa}</span>
                  </div>
                )}
                {profile.englishCerts && profile.englishCerts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 sm:col-span-2">
                    {profile.englishCerts.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {c.type}
                        {c.score ? ` ${c.score}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-2 sm:col-span-2">
                  <TrendingUp className="text-muted-foreground mt-0.5 size-4" />
                  <div className="flex flex-wrap gap-1">
                    {(profile.resolvedUniversities ?? []).length > 0 ? (
                      profile.resolvedUniversities!.map((u, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {u.universityName} {u.facultyName}
                        </Badge>
                      ))
                    ) : profile.targetUniversities.length > 0 ? (
                      profile.targetUniversities.map((u) => (
                        <Badge key={u} variant="outline" className="text-xs">
                          {u}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">
                        志望校未設定
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* スキル (提出の直近平均) */}
              <StudentSkillRadar
                detail={detail}
                essayAxisAvg={essayAxisAvg}
                interviewAxisAvg={interviewAxisAvg}
              />

              <Separator />

              {/* 弱点 */}
              <div>
                <p className="mb-2 text-sm font-medium">弱点</p>
                {weaknesses.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    弱点データなし
                  </p>
                ) : (
                  <WeaknessTopChart weaknesses={weaknesses} />
                )}
              </div>
            </div>
          )}

          {/* 成績・弱点 */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="size-4" />
                  スコア推移
                </p>
                <ScoresTrendChart
                  essayData={essayChartData}
                  interviewData={interviewChartData}
                />
              </div>

              <CategoryAverageRadar
                essayAverages={detail.essayCategoryAverages}
                interviewAverages={detail.interviewCategoryAverages}
                essayCount={detail.essayStatsSummary?.count}
                interviewCount={detail.interviewStatsSummary?.count}
              />

              <Separator />

              {/* 添削履歴 */}
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4" />
                  添削履歴
                </p>
                {essays.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    添削履歴なし
                  </p>
                ) : (
                  <div className="space-y-2">
                    {essays.map((essay) => (
                      <div
                        key={essay.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {essay.targetUniversity} {essay.targetFaculty}
                          </p>
                          {essay.topic && (
                            <p className="text-muted-foreground text-xs">
                              {essay.topic}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs">
                            {new Date(essay.submittedAt).toLocaleDateString(
                              "ja-JP"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {essay.scores ? (
                            <>
                              <SkillRankBadge
                                rank={scoreToSkillRank(
                                  essay.scores.total,
                                  essay.scoreMaximum ?? 50
                                )}
                                size="sm"
                                animate={false}
                              />
                              <Badge
                                variant="outline"
                                className={`text-sm font-bold ${scoreColor(essay.scores.total, essay.scoreMaximum ?? 50)}`}
                              >
                                {essay.scores.total}/{essay.scoreMaximum ?? 50}
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {essay.status === "uploaded"
                                ? "OCR待ち"
                                : essay.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <InterviewsSection studentId={studentId} />

              <Separator />

              <SummaryDrillsSection studentId={studentId} />
            </div>
          )}

          {/* 活動・書類 */}
          {activeTab === "activity" && (
            <div className="space-y-6">
              <DocumentsSection studentId={studentId} />
              <ActivitiesSection studentId={studentId} />
              <SessionsHistorySection studentId={studentId} />
              <ExamResultsSection studentId={studentId} />
            </div>
          )}

          {/* 宿題 */}
          {activeTab === "homework" && (
            <HomeworkStatusSection studentId={studentId} />
          )}

          {/* メモ */}
          {activeTab === "memos" && (
            <div className="space-y-6">
              <CoachMemo studentId={studentId} />
              <AiConversationsSection studentId={studentId} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
