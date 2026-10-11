"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { WeaknessRecord, getWeaknessReminderLevel } from "@/lib/types/growth";
import { normalizedEssayTotal } from "@/lib/types/essay";
import type { EssayKind } from "@/lib/essay/essay-kind";
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
import { EssayDraftsSection } from "@/components/essay/EssayDraftsSection";
import { SkillRankPanel } from "@/components/skill-check/SkillRankPanel";
import type { StudentRankResponse } from "@/lib/types/rank";

interface EssayHistoryItem {
  id: string;
  submittedAt: string;
  scores: { total: number };
  /** 合計の満点。口頭試問型は60。旧データは無し（=50） */
  scoreMaximum?: number;
  /** 答案の種類。スコア推移で線を分ける */
  kind?: EssayKind;
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
  const { data: rank, error: rankError } =
    useAuthSWR<StudentRankResponse>("/api/student/rank");
  // 取れなかったときに「まだ提出がありません」と出すと、提出0件と見分けがつかない
  const rankEmptyMessage = rankError
    ? "ランクを読み込めませんでした"
    : "まだ提出がありません";
  const loadingTrend = loadingHistory || loadingInterview;

  const essayTrend = useMemo(() => {
    return (essayData?.essays ?? [])
      .filter((e) => e.scores && typeof e.scores.total === "number")
      .map((e) => {
        const d = new Date(e.submittedAt);
        // 満点の違う答案を同じ線に混ぜない（口頭試問型は60点満点）
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: normalizedEssayTotal(e.scores.total, e.scoreMaximum),
          kind: e.kind,
          ts: d.getTime(),
        };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [essayData]);

  const interviewTrend = useMemo(() => {
    return (interviewData?.interviews ?? [])
      .filter((i) => i.scores && typeof i.scores.total === "number")
      .map((i) => {
        const d = new Date(i.startedAt);
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: i.scores!.total,
          ts: d.getTime(),
        };
      })
      .sort((a, b) => a.ts - b.ts);
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

  /**
   * 並び（PC）: ランク｜次回セッション、スコア推移｜弱点 の2段の後に、書きかけと
   * 志望校を横いっぱいで置く（志望校のカードは横長なので狭い列に入らない）。
   * スマホは1列で、面談の予定とランクを先に、
   * 続きを書く下書き → 弱点 → 推移 → 志望校の順にする（order で並べ替える）。
   */
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 lg:gap-4 lg:px-6 lg:py-4">
      <NotificationPermissionBanner />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
        {/* ランク */}
        <section className="order-2 min-w-0 lg:order-none lg:col-span-8">
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <Link href="/student/growth" className="block">
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
            <Link href="/student/growth" className="block">
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
          <div className="hidden gap-3 lg:grid lg:grid-cols-2">
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
          </div>
        </section>

        {/* 次回セッション */}
        <section
          className="order-1 min-w-0 lg:order-none lg:col-span-4"
          data-tour="upcoming-session"
        >
          <UpcomingSessionCard />
        </section>

        {/* スコア推移 */}
        <section
          className="order-5 min-w-0 lg:order-none lg:col-span-8"
          data-tour="score-trend"
        >
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
                <Skeleton className="h-[220px] w-full rounded" />
              ) : (
                <ScoresTrendChart
                  essayData={essayTrend}
                  interviewData={interviewTrend}
                  height={220}
                />
              )}
            </CardContent>
          </Card>
        </section>

        {/* 弱点 */}
        <section className="order-4 flex min-w-0 flex-col gap-2 lg:order-none lg:col-span-4">
          <WeaknessSummaryCompact />
          <WeaknessReminderBanner maxItems={2} compact />
        </section>

        {/* 書きかけの下書き */}
        <section className="order-3 min-w-0 lg:order-none lg:col-span-12">
          <EssayDraftsSection />
        </section>

        {/* 志望校 */}
        <section
          className="order-6 min-w-0 lg:order-none lg:col-span-12"
          data-tour="target-universities"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="text-muted-foreground size-3.5" />
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase lg:text-sm">
              志望校
            </h2>
          </div>
          <TargetUniversityCards targetUniversities={targetUniversities} />
        </section>
      </div>
    </div>
  );
}

function WeaknessSummaryCompact() {
  const { data } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>(
    "/api/growth/weaknesses?context=all"
  );
  // 成長画面の3列と件数を揃える（段階の付かない弱点は数えない。「もう見ない」を押したものは数える）
  const weaknesses = (data?.weaknesses ?? []).filter(
    (w) => getWeaknessReminderLevel(w) !== null
  );

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
