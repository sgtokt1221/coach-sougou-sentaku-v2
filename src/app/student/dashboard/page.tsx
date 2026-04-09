"use client";

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

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  submittedAt: string;
  scores: { total: number };
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

  // 時間帯に応じた挨拶メッセージ
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "おつかれさまです";
  const userName = studentProfile?.displayName;

  const { data: essayData, isLoading: loadingHistory } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history?userId=current");
  const loadingTrend = loadingHistory;

  const history = (essayData?.essays ?? []).slice(0, 3);

  const rawTrend = (essayData?.essays ?? [])
    .filter((e) => e.scores)
    .map((e) => {
      const d = new Date(e.submittedAt);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        total: e.scores.total,
        structure: 0,
        logic: 0,
        expression: 0,
        apAlignment: 0,
        originality: 0,
      };
    });
  const trendData = rawTrend;
  const latestScore = trendData.length > 0 ? trendData[trendData.length - 1].total : null;

  return (
    <div className="space-y-8 lg:space-y-10 px-4 py-6 lg:px-8 lg:py-10 max-w-5xl mx-auto">
      {/* Header — Stripe: light weight, no decorations */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">{greeting}</p>
        <h1 className="text-xl lg:text-2xl font-light tracking-tight text-foreground">
          {userName ? `${userName}さん、` : ""}学習の進捗を確認しましょう
        </h1>
      </div>

      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Target Universities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">志望校</h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </div>

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
                <ScoresTrendChart data={trendData} />
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
