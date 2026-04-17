"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { WeaknessRecord } from "@/lib/types/growth";
import { FileEdit, Mic as MicIcon, CheckCircle2, Target, ArrowUpRight, GraduationCap } from "lucide-react";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { useAuth } from "@/contexts/AuthContext";
import { TargetUniversityCards } from "@/components/dashboard/TargetUniversityCards";
import type { StudentProfile } from "@/lib/types/user";
import { useAuthSWR } from "@/lib/api/swr";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import type { SelfAnalysis } from "@/lib/types/self-analysis";
import { SkillCheckRefreshBanner } from "@/components/skill-check/SkillCheckRefreshBanner";
import { SkillRankPanel } from "@/components/skill-check/SkillRankPanel";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";

interface EssayHistoryItem {
  id: string;
  submittedAt: string;
  scores: { total: number };
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

  const essayTrend = useMemo(() => {
    return (essayData?.essays ?? [])
      .filter((e) => e.scores && typeof e.scores.total === "number")
      .map((e) => {
        const d = new Date(e.submittedAt);
        return { date: `${d.getMonth() + 1}/${d.getDate()}`, total: e.scores.total, _ts: d.getTime() };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts: _, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
  }, [essayData]);

  const interviewTrend = useMemo(() => {
    return (interviewData?.interviews ?? [])
      .filter((i) => i.scores && typeof i.scores.total === "number")
      .map((i) => {
        const d = new Date(i.startedAt);
        return { date: `${d.getMonth() + 1}/${d.getDate()}`, total: i.scores!.total, _ts: d.getTime() };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts: _, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
  }, [interviewData]);

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
    <div className="flex flex-col gap-3 lg:gap-4 px-3 py-3 lg:px-6 lg:py-4 max-w-6xl mx-auto h-full">
      <NotificationPermissionBanner />
      {skillCheckStatus?.needsRefresh && skillCheckStatus.daysSinceLast !== null && (
        <SkillCheckRefreshBanner daysSinceLast={skillCheckStatus.daysSinceLast} />
      )}

      {/* Mobile: 志望校を一番上に大きく（フル版） */}
      <section className="lg:hidden">
        <div className="flex items-center gap-1.5 mb-1.5">
          <GraduationCap className="size-3.5 text-muted-foreground" />
          <h2 className="text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wide">志望校</h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </section>

      {/* Mobile: GrowthTree (左3/5) + スキル縦積み (右2/5) */}
      <section className="grid grid-cols-5 gap-2 lg:hidden">
        <Link href="/student/self-analysis" className="col-span-3 block group">
          <GrowthTree
            compact
            completedSteps={saCompletedSteps}
            stepsData={saStepsData}
            className="group-hover:shadow-md transition-shadow h-full"
          />
        </Link>
        <div className="col-span-2 flex flex-col gap-2">
          <Link href="/student/skill-check" className="block flex-1">
            <SkillRankPanel
              minimal
              label="小論文レベル"
              rank={skillCheckStatus?.latestResult?.rank ?? null}
              score={skillCheckStatus?.latestResult?.scores.total ?? null}
              maxScore={50}
              category={skillCheckStatus?.currentCategory ?? skillCheckStatus?.latestResult?.category ?? null}
              emptyMessage="未受験 → 受ける"
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
              aggregate={skillCheckStatus?.aggregate}
            />
          </Link>
          <Link href="/student/interview-skill-check" className="block flex-1">
            <SkillRankPanel
              minimal
              label="面接レベル"
              rank={interviewSkillStatus?.latestResult?.rank ?? null}
              score={interviewSkillStatus?.latestResult?.scores.total ?? null}
              maxScore={40}
              emptyMessage="未受験 → 受ける"
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
              aggregate={interviewSkillStatus?.aggregate}
            />
          </Link>
        </div>
      </section>

      {/* Desktop: 志望校を大きく（フル版、横並び） */}
      <section className="hidden lg:block">
        <div className="flex items-center gap-1.5 mb-2">
          <GraduationCap className="size-3.5 text-muted-foreground" />
          <h2 className="text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wide">志望校</h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </section>

      {/* Desktop: スキル2つ */}
      <section className="hidden lg:grid lg:grid-cols-2 gap-3">
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
      </section>

      {/* Row 2: 成長ツリー+弱点 | スコア推移 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <div className="lg:col-span-5 flex flex-col gap-2 min-h-0">
          <Link href="/student/self-analysis" className="hidden lg:block group">
            <GrowthTree
              compact
              completedSteps={saCompletedSteps}
              stepsData={saStepsData}
              className="group-hover:shadow-md transition-shadow"
            />
          </Link>
          <WeaknessSummaryCompact />
          <WeaknessReminderBanner maxItems={2} compact />
        </div>

        <div className="lg:col-span-7">
          <Card className="rounded-lg border-border/60 h-full" style={{ boxShadow: "0 2px 5px rgba(50,50,93,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-foreground">スコア推移</CardTitle>
                  {latestScore !== null && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${scoreBg(latestScore)} ${scoreColor(latestScore)}`}>
                      最新 {latestScore}点
                    </span>
                  )}
                </div>
                <Link href="/student/growth" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  詳細 <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              {loadingTrend ? (
                <Skeleton className="h-[200px] w-full rounded" />
              ) : (
                <ScoresTrendChart essayData={essayTrend} interviewData={interviewTrend} height={200} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function WeaknessSummaryCompact() {
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
    { label: "解決", count: resolvedCount, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "未解決", count: totalActive, icon: Target, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5 ${item.count === 0 ? "opacity-40" : ""}`}
        >
          <div className={`flex size-6 items-center justify-center rounded ${item.bg}`}>
            <item.icon className={`size-3 ${item.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-muted-foreground leading-none">{item.label}</p>
            <p className={`text-sm font-semibold tabular-nums leading-tight ${item.color}`}>{item.count}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
