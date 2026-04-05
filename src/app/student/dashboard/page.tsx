"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import {
  FileText,
  TrendingUp,
  Mic,
  FolderOpen,
  ArrowUpRight,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TargetUniversityCards } from "@/components/dashboard/TargetUniversityCards";
import { DailyTasksPanel } from "@/components/student/DailyTasksPanel";
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

  const { data: essayData, isLoading: loadingHistory } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history");
  const loadingTrend = loadingHistory;

  const history = (essayData?.essays ?? []).slice(0, 3);

  const rawTrend = (essayData?.essays ?? [])
    .filter((e) => e.scores)
    .map((e) => ({
      date: e.submittedAt.slice(5).replace("-", "/"),
      total: e.scores.total,
      structure: 0,
      logic: 0,
      expression: 0,
      apAlignment: 0,
      originality: 0,
    }));
  const trendData = rawTrend;
  const latestScore = trendData.length > 0 ? trendData[trendData.length - 1].total : null;

  return (
    <div className="space-y-6 lg:space-y-10 px-4 py-5 lg:px-8 lg:py-8 max-w-5xl mx-auto">
      {/* Header with greeting */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary/70" />
          <p className="text-xs font-medium text-primary/70 uppercase tracking-wide">
            {greeting}
          </p>
        </div>
        <h1 className="font-heading text-xl lg:text-3xl font-bold tracking-tight">
          {userName ? `${userName}さん、` : ""}学習の進捗を確認しましょう
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          今日も目標に向かって一歩ずつ進んでいきましょう
        </p>
      </div>

      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Daily Tasks AI Panel */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <DailyTasksPanel />
      </div>

      {/* Target Universities */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="size-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">志望校</h2>
        </div>
        <TargetUniversityCards targetUniversities={targetUniversities} />
      </div>

      {/* Quick Actions */}
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className={`group relative card-hover rounded-xl border-2 border-transparent p-4 lg:p-5 flex items-center gap-3 ${action.bgColor} transition-all duration-200 hover:scale-105 hover:shadow-lg`}>
              {/* Gradient border accent */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${action.gradient} rounded-t-xl`} />

              <div className={`flex size-11 items-center justify-center rounded-xl ${action.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className={`size-5 ${action.iconColor}`} />
              </div>
              <span className={`text-sm font-semibold flex-1 ${action.textColor}`}>{action.label}</span>
              <ArrowUpRight className={`size-4 opacity-50 group-hover:opacity-100 transition-opacity duration-200 ${action.textColor}`} />
            </div>
          </Link>
        ))}
      </AnimatedList>

      {/* Weakness Reminder */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <WeaknessReminderBanner />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Score Trend - wider */}
        <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50">
              {/* Subtle gradient line */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-primary" />
                  スコア推移
                  {/* 直近スコアのbadge */}
                  {latestScore && (
                    <span className={`ml-2 px-2 py-1 text-xs font-bold rounded-full ${scoreBg(latestScore)} ${scoreColor(latestScore)}`}>
                      最新: {latestScore}点
                    </span>
                  )}
                </CardTitle>
                <Link
                  href="/student/growth"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  詳細 <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingTrend ? (
                <Skeleton className="h-[260px] w-full rounded-lg" />
              ) : (
                <ScoresTrendChart data={trendData} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Essays - narrower */}
        <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-primary" />
                  直近の添削
                </CardTitle>
                <Link
                  href="/student/essay/history"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
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
                    <div className="group card-hover flex items-center justify-between rounded-lg border p-2.5 lg:p-3 cursor-pointer relative overflow-hidden">
                      {/* スコアに応じたカラーバー */}
                      <div
                        className={`absolute left-0 top-0 w-1 h-full rounded-l-lg transition-all duration-300 group-hover:w-2 ${
                          item.scores.total >= 40 ? 'bg-emerald-500' :
                          item.scores.total >= 30 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                      />

                      <div className="min-w-0 pl-2">
                        <p className="text-sm font-medium truncate">
                          {item.universityName} {item.facultyName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.submittedAt}
                        </p>
                      </div>
                      <div className={`flex items-center justify-center size-11 rounded-lg ${scoreBg(item.scores.total)}`}>
                        <CountUp
                          value={item.scores.total}
                          duration={0.6}
                          className={`font-heading text-lg font-bold ${scoreColor(item.scores.total)}`}
                        />
                      </div>
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
