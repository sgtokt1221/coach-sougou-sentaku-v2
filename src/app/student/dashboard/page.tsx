"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { WeaknessRecord } from "@/lib/types/growth";
import { normalizedEssayTotal } from "@/lib/types/essay";
import {
  FileEdit,
  Mic as MicIcon,
  CheckCircle2,
  Target,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { useAuth } from "@/contexts/AuthContext";
import { TargetUniversityCards } from "@/components/dashboard/TargetUniversityCards";
import type { StudentProfile } from "@/lib/types/user";
import { useAuthSWR } from "@/lib/api/swr";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { UpcomingSessionCard } from "@/components/student/UpcomingSessionCard";
import { LogicalTourHero } from "@/components/student/LogicalTourHero";
import { ChocoSeriesAnnouncement } from "@/components/student/ChocoSeriesAnnouncement";
import { EssayDraftsSection } from "@/components/essay/EssayDraftsSection";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import type { SelfAnalysis } from "@/lib/types/self-analysis";
import { SkillRankPanel } from "@/components/skill-check/SkillRankPanel";
import type { StudentRankResponse } from "@/lib/types/rank";

interface EssayHistoryItem {
  id: string;
  submittedAt: string;
  scores: { total: number };
  /** 合計の満点。口頭試問型は60。旧データは無し（=50） */
  scoreMaximum?: number;
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
  const { userProfile, loading: authLoading } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const targetUniversities = studentProfile?.targetUniversities ?? [];

  const { data: essayData, isLoading: loadingHistory } = useAuthSWR<{
    essays: EssayHistoryItem[];
  }>("/api/essay/history?userId=current");
  const { data: interviewData, isLoading: loadingInterview } = useAuthSWR<{
    interviews: {
      id: string;
      startedAt: string;
      scores: { total: number } | null;
    }[];
  }>("/api/interview/history?userId=current");
  const { data: selfAnalysisData, isLoading: loadingSelfAnalysisSWR } =
    useAuthSWR<SelfAnalysis | null>("/api/self-analysis?userId=me");
  // 認証ロード中は useAuthSWR の key が null → isLoading=false になるため、
  // authLoading も含めて初回マウントを1回に抑え、GSAP タイムラインが中断されないようにする
  const loadingSelfAnalysis = authLoading || loadingSelfAnalysisSWR;
  const { data: rank, error: rankError } =
    useAuthSWR<StudentRankResponse>("/api/student/rank");
  // 取れなかったときに「まだ提出がありません」と出すと、提出0件と見分けがつかない
  const rankEmptyMessage = rankError
    ? "ランクを読み込めませんでした"
    : "まだ提出がありません";
  const loadingTrend = loadingHistory || loadingInterview;

  const { saCompletedSteps, saStepsData } = useMemo(() => {
    if (!selfAnalysisData)
      return {
        saCompletedSteps: 0,
        saStepsData: {} as Record<number, Record<string, unknown>>,
      };
    const completed = selfAnalysisData.completedSteps ?? 0;
    const data: Record<number, Record<string, unknown>> = {};
    const STEP_KEYS = [
      "values",
      "strengths",
      "weaknesses",
      "interests",
      "vision",
      "identity",
    ] as const;
    STEP_KEYS.forEach((key, i) => {
      const val = (selfAnalysisData as unknown as Record<string, unknown>)[key];
      if (
        val &&
        typeof val === "object" &&
        Object.keys(val as object).length > 0
      ) {
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
        // 満点の違う答案を同じ線に混ぜない（口頭試問型は60点満点）
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: normalizedEssayTotal(e.scores.total, e.scoreMaximum),
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

  const latestScore = useMemo(() => {
    const allPoints = [
      ...(essayData?.essays ?? [])
        .filter((e) => e.scores && typeof e.scores.total === "number")
        .map((e) => ({
          ts: new Date(e.submittedAt).getTime(),
          total: normalizedEssayTotal(e.scores.total, e.scoreMaximum),
        })),
      ...(interviewData?.interviews ?? [])
        .filter((i) => i.scores && typeof i.scores.total === "number")
        .map((i) => ({
          ts: new Date(i.startedAt).getTime(),
          total: i.scores!.total,
        })),
    ];
    if (allPoints.length === 0) return null;
    return allPoints.sort((a, b) => b.ts - a.ts)[0].total;
  }, [essayData, interviewData]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-3 px-3 py-3 lg:gap-4 lg:px-6 lg:py-4">
      <NotificationPermissionBanner />

      <ChocoSeriesAnnouncement />

      <LogicalTourHero />

      <div data-tour="upcoming-session">
        <UpcomingSessionCard />
      </div>

      <EssayDraftsSection />

      {/* Mobile: 志望校を一番上に大きく（フル版） */}
      <section className="lg:hidden">
        <div className="mb-1.5 flex items-center gap-1.5">
          <GraduationCap className="text-muted-foreground size-3.5" />
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase lg:text-sm">
            志望校
          </h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </section>

      {/* Mobile: GrowthTree (左3/5) + スキル縦積み (右2/5) */}
      <section className="grid grid-cols-5 gap-2 lg:hidden">
        <Link href="/student/self-analysis" className="group col-span-3 block">
          {loadingSelfAnalysis ? (
            <div className="border-border/40 h-full min-h-[200px] animate-pulse rounded-2xl border bg-gradient-to-b from-sky-50 to-emerald-50/40" />
          ) : (
            <GrowthTree
              compact
              completedSteps={saCompletedSteps}
              stepsData={saStepsData}
              className="h-full transition-shadow group-hover:shadow-md"
            />
          )}
        </Link>
        <div className="col-span-2 flex flex-col gap-2">
          <Link href="/student/growth" className="block flex-1">
            <SkillRankPanel
              minimal
              label="小論文レベル"
              rank={rank?.essay.compositeRank ?? null}
              score={rank?.essay.compositeScore ?? null}
              maxScore={50}
              emptyMessage={rankEmptyMessage}
              className="h-full cursor-pointer transition-shadow hover:shadow-md"
              aggregate={rank?.essay}
            />
          </Link>
          <Link href="/student/growth" className="block flex-1">
            <SkillRankPanel
              minimal
              label="面接レベル"
              rank={rank?.interview.compositeRank ?? null}
              score={rank?.interview.compositeScore ?? null}
              maxScore={40}
              emptyMessage={rankEmptyMessage}
              className="h-full cursor-pointer transition-shadow hover:shadow-md"
              aggregate={rank?.interview}
            />
          </Link>
        </div>
      </section>

      {/* Desktop: 志望校を大きく（フル版、横並び） */}
      <section className="hidden lg:block" data-tour="target-universities">
        <div className="mb-2 flex items-center gap-1.5">
          <GraduationCap className="text-muted-foreground size-3.5" />
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase lg:text-sm">
            志望校
          </h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </section>

      {/* Desktop: スキル2つ */}
      <section className="hidden gap-3 lg:grid lg:grid-cols-2">
        <Link
          href="/student/growth"
          className="block"
          data-tour="skill-rank-essay"
        >
          <SkillRankPanel
            label="小論文スキル"
            rank={rank?.essay.compositeRank ?? null}
            score={rank?.essay.compositeScore ?? null}
            maxScore={50}
            emptyMessage={rankEmptyMessage}
            className="h-full cursor-pointer transition-shadow hover:shadow-md"
            aggregate={rank?.essay}
          />
        </Link>
        <Link href="/student/growth" className="block">
          <SkillRankPanel
            label="面接スキル"
            rank={rank?.interview.compositeRank ?? null}
            score={rank?.interview.compositeScore ?? null}
            maxScore={40}
            emptyMessage={rankEmptyMessage}
            className="h-full cursor-pointer transition-shadow hover:shadow-md"
            aggregate={rank?.interview}
          />
        </Link>
      </section>

      {/* Row 2: 成長ツリー+弱点 | スコア推移 */}
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col gap-2 lg:col-span-5">
          <Link
            href="/student/self-analysis"
            className="group hidden lg:block"
            data-tour="growth-tree"
          >
            {loadingSelfAnalysis ? (
              <div className="border-border/40 h-[280px] animate-pulse rounded-2xl border bg-gradient-to-b from-sky-50 to-emerald-50/40" />
            ) : (
              <GrowthTree
                compact
                completedSteps={saCompletedSteps}
                stepsData={saStepsData}
                className="transition-shadow group-hover:shadow-md"
              />
            )}
          </Link>
          <WeaknessSummaryCompact />
          <WeaknessReminderBanner maxItems={2} compact />
        </div>

        <div className="lg:col-span-7" data-tour="score-trend">
          <Card
            className="border-border/60 h-full rounded-lg"
            style={{
              boxShadow:
                "0 2px 5px rgba(50,50,93,0.1), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <CardHeader className="pt-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-foreground text-sm font-medium">
                    スコア推移
                  </CardTitle>
                  {latestScore !== null && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${scoreBg(latestScore)} ${scoreColor(latestScore)}`}
                    >
                      最新 {latestScore}点
                    </span>
                  )}
                </div>
                <Link
                  href="/student/growth"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                >
                  詳細 <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              {loadingTrend ? (
                <Skeleton className="h-[200px] w-full rounded" />
              ) : (
                <ScoresTrendChart
                  essayData={essayTrend}
                  interviewData={interviewTrend}
                  height={200}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function WeaknessSummaryCompact() {
  const { data } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>(
    "/api/growth/weaknesses?context=all"
  );
  const weaknesses = data?.weaknesses ?? [];

  if (weaknesses.length === 0) return null;

  const essayCount = weaknesses.filter(
    (w) => !w.resolved && (w.source === "essay" || w.source === "both")
  ).length;
  const interviewCount = weaknesses.filter(
    (w) => !w.resolved && (w.source === "interview" || w.source === "both")
  ).length;
  const resolvedCount = weaknesses.filter((w) => w.resolved).length;
  const totalActive = weaknesses.filter((w) => !w.resolved).length;

  const items = [
    {
      label: "添削",
      count: essayCount,
      icon: FileEdit,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
    },
    {
      label: "面接",
      count: interviewCount,
      icon: MicIcon,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "解決",
      count: resolvedCount,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "未解決",
      count: totalActive,
      icon: Target,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`border-border/60 flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${item.count === 0 ? "opacity-40" : ""}`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded ${item.bg}`}
          >
            <item.icon className={`size-3 ${item.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[9px] leading-none">
              {item.label}
            </p>
            <p
              className={`text-sm leading-tight font-semibold tabular-nums ${item.color}`}
            >
              {item.count}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
