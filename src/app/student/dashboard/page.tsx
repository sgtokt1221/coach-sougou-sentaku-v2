"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { WeaknessRecord } from "@/lib/types/growth";
import { FileEdit, Mic as MicIcon, CheckCircle2, Target } from "lucide-react";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import {
  FileText,
  TrendingUp,
  Mic,
  FolderOpen,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TargetUniversityCards } from "@/components/dashboard/TargetUniversityCards";
import type { StudentProfile } from "@/lib/types/user";
import { useAuthSWR } from "@/lib/api/swr";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { AnimatedList } from "@/components/shared/AnimatedList";
import { CountUp } from "@/components/shared/CountUp";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import type { SelfAnalysis } from "@/lib/types/self-analysis";
import { SkillCheckRefreshBanner } from "@/components/skill-check/SkillCheckRefreshBanner";
import { SkillRankPanel } from "@/components/skill-check/SkillRankPanel";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  submittedAt: string;
  scores: { total: number; structure?: number; logic?: number; expression?: number; apAlignment?: number; originality?: number };
}

interface TrendDataPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}


function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBg(total: number): string {
  if (total >= 40) return "bg-emerald-50 dark:bg-emerald-950/30";
  if (total >= 30) return "bg-amber-50 dark:bg-amber-950/30";
  return "bg-rose-50 dark:bg-rose-950/30";
}

const quickActions = [
  {
    label: "小論文を提出",
    href: "/student/essay/new",
    icon: FileText,
    gradient: "from-teal-500 to-teal-600",
    bgColor: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/40 dark:to-teal-900/30",
    textColor: "text-teal-700 dark:text-teal-300",
    iconBg: "bg-white dark:bg-teal-950/50",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    label: "模擬面接を開始",
    href: "/student/interview/new",
    icon: Mic,
    gradient: "from-indigo-500 to-indigo-600",
    bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30",
    textColor: "text-indigo-700 dark:text-indigo-300",
    iconBg: "bg-white dark:bg-indigo-950/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    label: "出願書類を編集",
    href: "/student/documents",
    icon: FolderOpen,
    gradient: "from-amber-500 to-amber-600",
    bgColor: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-white dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export default function StudentDashboard() {
  const { userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const targetUniversities = studentProfile?.targetUniversities ?? [];

  const { data: essayData, isLoading: loadingHistory } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history?userId=current");
  const { data: interviewData, isLoading: loadingInterview } = useAuthSWR<{ interviews: { id: string; startedAt: string; scores: { total: number } | null }[] }>("/api/interview/history?userId=current");
  const { data: selfAnalysisData } = useAuthSWR<SelfAnalysis | null>("/api/self-analysis?userId=me");
  const { data: skillCheckStatus } = useAuthSWR<SkillCheckStatus>("/api/skill-check/status");
  const { data: interviewSkillStatus } = useAuthSWR<InterviewSkillCheckStatus>("/api/interview-skill-check/status");
  const loadingTrend = loadingHistory || loadingInterview;

  // 自己分析の進捗と stepsData を抽出 (GrowthTree 用)
  const { saCompletedSteps, saStepsData } = useMemo(() => {
    if (!selfAnalysisData) return { saCompletedSteps: 0, saStepsData: {} as Record<number, Record<string, unknown>> };
    const completed = selfAnalysisData.completedSteps ?? 0;
    const data: Record<number, Record<string, unknown>> = {};
    const STEP_KEYS = ["values", "strengths", "weaknesses", "interests", "vision", "identity"] as const;
    STEP_KEYS.forEach((key, i) => {
      const val = (selfAnalysisData as unknown as Record<string, unknown>)[key];
      if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
        data[i + 1] = val as Record<string, unknown>;
      }
    });
    return { saCompletedSteps: completed, saStepsData: data };
  }, [selfAnalysisData]);

  const history = (essayData?.essays ?? []).slice(0, 3);

  // 小論文と面接を別系列として保持 (チャート側で 2 本線として描画)
  const essayTrend = useMemo(() => {
    return (essayData?.essays ?? [])
      .filter((e) => e.scores && typeof e.scores.total === "number")
      .map((e) => {
        const d = new Date(e.submittedAt);
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: e.scores.total,
          _ts: d.getTime(),
        };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts: _, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
  }, [essayData]);

  const interviewTrend = useMemo(() => {
    return (interviewData?.interviews ?? [])
      .filter((i) => i.scores && typeof i.scores.total === "number")
      .map((i) => {
        const d = new Date(i.startedAt);
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: i.scores!.total,
          _ts: d.getTime(),
        };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts: _, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
  }, [interviewData]);

  // 最新スコア: 2 系列のうち時系列で最新のもの
  const latestScore = useMemo(() => {
    const allPoints = [
      ...(essayData?.essays ?? [])
        .filter((e) => e.scores && typeof e.scores.total === "number")
        .map((e) => ({ ts: new Date(e.submittedAt).getTime(), total: e.scores.total })),
      ...(interviewData?.interviews ?? [])
        .filter((i) => i.scores && typeof i.scores.total === "number")
        .map((i) => ({ ts: new Date(i.startedAt).getTime(), total: i.scores!.total })),
    ];
    if (allPoints.length === 0) return null;
    return allPoints.sort((a, b) => b.ts - a.ts)[0].total;
  }, [essayData, interviewData]);

  return (
    <div className="space-y-8 lg:space-y-10 px-4 py-6 lg:px-8 lg:py-10 max-w-5xl mx-auto">
      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Skill Check: 小論文 + 面接を1セクションで並列表示 */}
      {(skillCheckStatus?.needsRefresh && skillCheckStatus.daysSinceLast !== null) && (
        <SkillCheckRefreshBanner daysSinceLast={skillCheckStatus.daysSinceLast} />
      )}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            スキル診断
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/student/skill-check" className="block">
            <SkillRankPanel
              label="小論文スキル"
              rank={skillCheckStatus?.latestResult?.rank ?? null}
              score={skillCheckStatus?.latestResult?.scores.total ?? null}
              maxScore={50}
              takenAt={skillCheckStatus?.latestResult?.takenAt ?? null}
              daysSinceLast={skillCheckStatus?.daysSinceLast ?? null}
              category={skillCheckStatus?.currentCategory ?? skillCheckStatus?.latestResult?.category ?? null}
              subLabel={skillCheckStatus?.needsRefresh ? "更新推奨" : undefined}
              emptyMessage="まだ受けていません → 受ける"
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
              aggregate={skillCheckStatus?.aggregate}
            />
          </Link>
          <Link href="/student/interview-skill-check" className="block">
            <SkillRankPanel
              label="面接スキル"
              rank={interviewSkillStatus?.latestResult?.rank ?? null}
              score={interviewSkillStatus?.latestResult?.scores.total ?? null}
              maxScore={40}
              takenAt={interviewSkillStatus?.latestResult?.takenAt ?? null}
              daysSinceLast={interviewSkillStatus?.daysSinceLast ?? null}
              subLabel={interviewSkillStatus?.needsRefresh ? "更新推奨" : undefined}
              emptyMessage="まだ受けていません → 受ける"
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
              aggregate={interviewSkillStatus?.aggregate}
            />
          </Link>
        </div>
      </section>

      {/* Target Universities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">志望校</h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </div>

      {/* 自己分析の木 */}
      <Link href="/student/self-analysis" className="block group">
        <GrowthTree
          completedSteps={saCompletedSteps}
          stepsData={saStepsData}
          className="group-hover:shadow-md transition-shadow"
        />
      </Link>

      {/* Quick Actions — Stripe: clean cards, blue-tinted shadow, no gradient bars */}
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div
              className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4 transition-all duration-200 hover:border-border"
              style={{ boxShadow: "0 2px 5px rgba(50,50,93,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
            >
              <div className={`flex size-10 items-center justify-center rounded-lg ${action.iconBg}`}>
                <action.icon className={`size-5 ${action.iconColor}`} />
              </div>
              <span className="text-sm font-medium flex-1 text-foreground">{action.label}</span>
              <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </AnimatedList>

      {/* Weakness Summary + Reminder */}
      <WeaknessSummarySection />
      <WeaknessReminderBanner />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Score Trend — Stripe: clean card, blue shadow */}
        <div className="lg:col-span-3">
          <Card className="rounded-lg border-border/60" style={{ boxShadow: "0 2px 5px rgba(50,50,93,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium text-foreground">スコア推移</CardTitle>
                  {latestScore && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${scoreBg(latestScore)} ${scoreColor(latestScore)}`}>
                      最新 {latestScore}点
                    </span>
                  )}
                </div>
                <Link
                  href="/student/growth"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  詳細 <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loadingTrend ? (
                <Skeleton className="h-[260px] w-full rounded" />
              ) : (
                <ScoresTrendChart essayData={essayTrend} interviewData={interviewTrend} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Essays — Stripe: minimal list */}
        <div className="lg:col-span-2">
          <Card className="h-full rounded-lg border-border/60" style={{ boxShadow: "0 2px 5px rgba(50,50,93,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground">直近の添削</CardTitle>
                <Link
                  href="/student/essay/history"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  すべて <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingHistory ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : (
                history.map((item) => (
                  <Link key={item.id} href={`/student/essay/${item.id}`}>
                    <div className="group flex items-center justify-between rounded-md border border-border/50 p-3 cursor-pointer transition-all duration-150 hover:border-border hover:bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {item.universityName} {item.facultyName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => { const d = new Date(item.submittedAt); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; })()}
                        </p>
                      </div>
                      <span className={`text-lg font-light tabular-nums ${scoreColor(item.scores.total)}`}>
                        <CountUp value={item.scores.total} duration={0.6} />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WeaknessSummarySection() {
  const { data } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>("/api/growth/weaknesses?context=dashboard");
  const weaknesses = data?.weaknesses ?? [];

  if (weaknesses.length === 0) return null;

  const essayCount = weaknesses.filter(w => !w.resolved && (w.source === "essay" || w.source === "both")).length;
  const interviewCount = weaknesses.filter(w => !w.resolved && (w.source === "interview" || w.source === "both")).length;
  const resolvedCount = weaknesses.filter(w => w.resolved).length;
  const totalActive = weaknesses.filter(w => !w.resolved).length;

  const items = [
    { label: "添削", count: essayCount, icon: FileEdit, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "面接", count: interviewCount, icon: MicIcon, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "解決済み", count: resolvedCount, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "未解決", count: totalActive, icon: Target, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2.5 ${item.count === 0 ? "opacity-40" : ""}`}
          style={{ boxShadow: "0 1px 3px rgba(50,50,93,0.06)" }}
        >
          <div className={`flex size-8 items-center justify-center rounded-md ${item.bg}`}>
            <item.icon className={`size-4 ${item.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${item.color}`}>{item.count}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
