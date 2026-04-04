"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Users, FileText, BarChart3, AlertTriangle, Trophy, FileWarning } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CountUp } from "@/components/shared/CountUp";
import { AnimatedList } from "@/components/shared/AnimatedList";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentListItem, AlertItem } from "@/lib/types/admin";
import type { ExamResultStats } from "@/lib/types/exam-result";

const mockStudents: StudentListItem[] = [
  {
    uid: "mock_student_001",
    displayName: "田中 太郎",
    email: "tanaka@example.com",
    targetUniversities: ["東京大学", "京都大学"],
    latestScore: 38,
    essayCount: 5,
    lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: [],
    scoreTrend: "up",
    activeWeaknessCount: 2,
    documentProgress: { completed: 3, total: 5 },
    lastSessionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_002",
    displayName: "佐藤 花子",
    email: "sato@example.com",
    targetUniversities: ["早稲田大学"],
    latestScore: 32,
    essayCount: 3,
    lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: ["inactive"],
    scoreTrend: "flat",
    activeWeaknessCount: 4,
    documentProgress: { completed: 1, total: 3 },
    lastSessionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_003",
    displayName: "鈴木 一郎",
    email: "suzuki@example.com",
    targetUniversities: ["大阪大学", "神戸大学"],
    latestScore: 41,
    essayCount: 8,
    lastActivityAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: [],
    scoreTrend: "up",
    activeWeaknessCount: 1,
    documentProgress: { completed: 4, total: 5 },
    lastSessionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_004",
    displayName: "山田 美咲",
    email: "yamada@example.com",
    targetUniversities: ["同志社大学"],
    latestScore: 25,
    essayCount: 6,
    lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: ["repeated_weakness", "declining"],
    scoreTrend: "down",
    activeWeaknessCount: 6,
    documentProgress: { completed: 0, total: 4 },
    lastSessionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_005",
    displayName: "高橋 健太",
    email: "takahashi@example.com",
    targetUniversities: ["慶應義塾大学", "明治大学"],
    latestScore: null,
    essayCount: 0,
    lastActivityAt: null,
    alertFlags: ["inactive"],
    scoreTrend: null,
    activeWeaknessCount: 0,
    documentProgress: { completed: 0, total: 0 },
    lastSessionAt: null,
  },
];

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function alertFlagLabel(flag: string): { label: string; variant: "destructive" | "secondary" } {
  switch (flag) {
    case "inactive":
      return { label: "非アクティブ", variant: "secondary" };
    case "repeated_weakness":
      return { label: "繰返し弱点", variant: "destructive" };
    case "declining":
      return { label: "スコア低下", variant: "destructive" };
    default:
      return { label: flag, variant: "secondary" };
  }
}

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const isSuperadmin = userProfile?.role === "superadmin";
  const { data: rawData, isLoading } = useAuthSWR<StudentListItem[]>("/api/admin/students");
  const { data: dashboardData } = useAuthSWR<{ examResultStats: ExamResultStats }>("/api/admin/dashboard");
  const { data: alertsData } = useAuthSWR<AlertItem[]>("/api/admin/alerts");
  const students = rawData ?? mockStudents;
  const loading = isLoading;

  const deadlineAlertCount = alertsData?.filter(
    (a) => a.type === "document_deadline" && !a.acknowledged
  ).length ?? 0;

  const totalStudents = students.length;
  const weeklyEssayCount = students.reduce((sum, s) => sum + s.essayCount, 0);
  const studentsWithScore = students.filter((s) => s.latestScore !== null);
  const averageScore =
    studentsWithScore.length > 0
      ? Math.round(
          studentsWithScore.reduce((sum, s) => sum + (s.latestScore ?? 0), 0) /
            studentsWithScore.length
        )
      : 0;
  const alertStudents = students.filter((s) => s.alertFlags.length > 0);

  const recentStudents = [...students]
    .filter((s) => s.lastActivityAt)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt!).getTime() -
        new Date(a.lastActivityAt!).getTime()
    )
    .slice(0, 5);

  const stats = [
    { label: "生徒数", value: totalStudents, icon: Users, color: "text-primary" },
    { label: "添削数合計", value: weeklyEssayCount, icon: FileText, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "平均スコア", value: `${averageScore}/50`, icon: BarChart3, color: "text-amber-600 dark:text-amber-400" },
    { label: "要注意生徒", value: alertStudents.length, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">生徒全体の状況を把握できます</p>
      </div>

      {/* Stats Cards - superadmin only */}
      {isSuperadmin && (
        loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <AnimatedList className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">
                        {typeof stat.value === "number" ? (
                          <CountUp value={stat.value} duration={0.8} />
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                    <stat.icon className={`size-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </AnimatedList>
        )
      )}

      {/* Exam Results Stats */}
      {dashboardData?.examResultStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" />
              合格率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {dashboardData.examResultStats.totalApplied}
                </p>
                <p className="text-xs text-muted-foreground">出願中</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {dashboardData.examResultStats.totalPassed}
                </p>
                <p className="text-xs text-muted-foreground">合格</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {dashboardData.examResultStats.totalFailed}
                </p>
                <p className="text-xs text-muted-foreground">不合格</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {dashboardData.examResultStats.totalWithdrawn}
                </p>
                <p className="text-xs text-muted-foreground">辞退</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {dashboardData.examResultStats.passRate !== null
                    ? `${dashboardData.examResultStats.passRate}%`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">合格率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Document Deadline Alerts */}
      {deadlineAlertCount > 0 && (
        <Link href="/admin/alerts?filter=document_deadline">
          <Card className="border-purple-200 bg-purple-50/50 transition-colors hover:bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20 dark:hover:bg-purple-950/30">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <FileWarning className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium">
                  書類期限アラート: {deadlineAlertCount}件
                </p>
                <p className="text-sm text-muted-foreground">
                  期限が迫っている未完成書類があります
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alert Students */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-5 text-rose-500" />
              要注意生徒
            </h2>
            <Link
              href="/admin/alerts"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              すべて見る &rarr;
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : alertStudents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                要注意の生徒はいません
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alertStudents.map((s) => (
                <Link key={s.uid} href={`/admin/students/${s.uid}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{s.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.targetUniversities.join(", ") || "志望校未設定"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {s.alertFlags.map((flag) => {
                          const { label, variant } = alertFlagLabel(flag);
                          return (
                            <Badge key={flag} variant={variant} className="text-xs">
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FileText className="size-5" />
            最近の活動
          </h2>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : recentStudents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                まだ活動記録がありません
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentStudents.map((s) => (
                <Link key={s.uid} href={`/admin/students/${s.uid}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{s.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          添削 {s.essayCount}件
                        </p>
                      </div>
                      <div className="text-right">
                        {s.latestScore !== null && (
                          <p className={`text-lg font-bold ${scoreColor(s.latestScore)}`}>
                            {s.latestScore}<span className="text-xs text-muted-foreground">/50</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {s.lastActivityAt
                            ? new Date(s.lastActivityAt).toLocaleDateString("ja-JP")
                            : "-"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
