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
import { SkillCheckDetailDialog } from "@/components/admin/SkillCheckDetailDialog";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { SummaryDrillsSection } from "@/components/admin/SummaryDrillsSection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";
import { SessionsHistorySection } from "@/components/admin/SessionsHistorySection";
import { ExamResultsSection } from "@/components/admin/ExamResultsSection";
import { GrowthReportsSection } from "@/components/admin/GrowthReportsSection";
import { EssayCoachHistorySection } from "@/components/admin/EssayCoachHistorySection";
import { HomeworkStatusSection } from "@/components/admin/HomeworkStatusSection";
import { CoachMemo } from "@/components/admin/CoachMemo";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import { getDisplayGrade } from "@/lib/utils/grade";
import type { StudentDetail } from "@/lib/types/admin";
import type {
  SkillCheckStatus,
  SkillCheckResult,
} from "@/lib/types/skill-check";
import type {
  InterviewSkillCheckStatus,
  InterviewSkillCheckResult,
} from "@/lib/types/interview-skill-check";

type DossierTab =
  | "overview"
  | "performance"
  | "activity"
  | "reports"
  | "homework"
  | "memos";

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
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
  skillCheck,
  interviewSkillCheck,
}: {
  studentId: string;
  detail: StudentDetail;
  skillCheck: SkillCheckStatus | null;
  interviewSkillCheck: InterviewSkillCheckStatus | null;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");
  const [scDialog, setScDialog] = useState<
    | { kind: "essay"; result: SkillCheckResult }
    | { kind: "interview"; result: InterviewSkillCheckResult }
    | null
  >(null);

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
              { id: "reports", label: "レポート", accent: "blue" },
              { id: "homework", label: "宿題", accent: "rose" },
              { id: "memos", label: "メモ", accent: "emerald" },
            ]}
            fullWidth
          />

          {/* 概要 */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* プロフィール要約 */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                {profile.school && (
                  <div className="flex items-center gap-2">
                    <School className="size-4 text-muted-foreground" />
                    <span>{profile.school}</span>
                  </div>
                )}
                {(profile.grade != null || profile.isRonin) && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-muted-foreground" />
                    <span>
                      {
                        getDisplayGrade(
                          profile.grade,
                          profile.gradeUpdatedAt,
                          profile.isRonin,
                        ).label
                      }
                    </span>
                  </div>
                )}
                {typeof profile.gpa === "number" && (
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-muted-foreground" />
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
                  <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
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
                      <span className="text-muted-foreground">志望校未設定</span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* スキル (最新スキルチェック) */}
              <StudentSkillRadar
                detail={detail}
                skillCheck={skillCheck}
                interviewSkillCheck={interviewSkillCheck}
                onSelectEssay={() =>
                  skillCheck?.latestResult &&
                  setScDialog({ kind: "essay", result: skillCheck.latestResult })
                }
                onSelectInterview={() =>
                  interviewSkillCheck?.latestResult &&
                  setScDialog({
                    kind: "interview",
                    result: interviewSkillCheck.latestResult,
                  })
                }
              />

              <Separator />

              {/* 弱点 */}
              <div>
                <p className="text-sm font-medium mb-2">弱点</p>
                {weaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
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
                <p className="flex items-center gap-2 text-sm font-medium mb-2">
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
                <p className="flex items-center gap-2 text-sm font-medium mb-3">
                  <FileText className="size-4" />
                  添削履歴
                </p>
                {essays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
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
                          <p className="font-medium text-sm">
                            {essay.targetUniversity} {essay.targetFaculty}
                          </p>
                          {essay.topic && (
                            <p className="text-xs text-muted-foreground">
                              {essay.topic}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(essay.submittedAt).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {essay.scores ? (
                            <>
                              <SkillRankBadge
                                rank={scoreToSkillRank(essay.scores.total, 50)}
                                size="sm"
                                animate={false}
                              />
                              <Badge
                                variant="outline"
                                className={`text-sm font-bold ${scoreColor(essay.scores.total)}`}
                              >
                                {essay.scores.total}/50
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {essay.status === "uploaded" ? "OCR待ち" : essay.status}
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

          {/* レポート */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <GrowthReportsSection studentId={studentId} />
              <EssayCoachHistorySection studentId={studentId} />
            </div>
          )}

          {/* 宿題 */}
          {activeTab === "homework" && (
            <HomeworkStatusSection studentId={studentId} />
          )}

          {/* メモ */}
          {activeTab === "memos" && <CoachMemo studentId={studentId} />}
        </div>
      </CardContent>

      <SkillCheckDetailDialog
        open={scDialog !== null}
        onOpenChange={(o) => !o && setScDialog(null)}
        kind={scDialog?.kind ?? "essay"}
        result={scDialog?.result ?? null}
      />
    </Card>
  );
}
