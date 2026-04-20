"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Users, FileText, BarChart3, AlertTriangle, FileWarning, TrendingDown, TrendingUp, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CountUp } from "@/components/shared/CountUp";
import { AnimatedList } from "@/components/shared/AnimatedList";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentListItem, AlertItem } from "@/lib/types/admin";
import type { ExamResultStats } from "@/lib/types/exam-result";
import { StudentStatusPie } from "@/components/admin/StudentStatusPie";
import { AiInterventionCard } from "@/components/admin/AiInterventionCard";

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
  const { data: rawData, isLoading } = useAuthSWR<StudentListItem[]>("/api/admin/students?limit=500");
  const { data: alertsData } = useAuthSWR<AlertItem[]>("/api/admin/alerts");
  const { data: weeklyWeaknesses } = useAuthSWR<{
    weeklyTop: { area: string; count: number; studentCount: number }[];
    comparedToLastWeek: { improved: string[]; worsened: string[]; new: string[] };
  }>("/api/admin/weekly-weaknesses");
  const { data: interventionData } = useAuthSWR<{
    items: Array<{
      studentUid: string;
      studentName: string;
      recommendation: string;
      reasoning: string;
      severity: "critical" | "high" | "warning";
    }>;
  }>("/api/admin/intervention-recommendations");
  const students = rawData ?? [];
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

      {/* Student Status Distribution */}
      {isSuperadmin && (
        <StudentStatusPie students={students} />
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

      {/* Weekly Common Weaknesses */}
      {weeklyWeaknesses && weeklyWeaknesses.weeklyTop.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" />
              今週の共通弱点
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyWeaknesses.weeklyTop.map((w, i) => {
              const isWorsened = weeklyWeaknesses.comparedToLastWeek.worsened.includes(w.area);
              const isNew = weeklyWeaknesses.comparedToLastWeek.new.includes(w.area);
              return (
                <div key={w.area} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{w.area}</p>
                      <p className="text-xs text-muted-foreground">{w.studentCount}名の生徒</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isWorsened && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <TrendingUp className="size-3" />悪化
                      </Badge>
                    )}
                    {isNew && (
                      <Badge className="bg-blue-500 text-[10px] gap-0.5">
                        <Sparkles className="size-3" />NEW
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{w.count}件</Badge>
                  </div>
                </div>
              );
            })}
            {weeklyWeaknesses.comparedToLastWeek.improved.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 p-3">
                <TrendingDown className="size-4 text-green-600" />
                <p className="text-xs text-green-700 dark:text-green-400">
                  改善: {weeklyWeaknesses.comparedToLastWeek.improved.join("、")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* AI Intervention Recommendations */}
      <AiInterventionCard items={interventionData?.items ?? []} />
    </div>
  );
}
