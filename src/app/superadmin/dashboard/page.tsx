"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  GraduationCap,
  UserX,
  Plus,
  UserPlus,
  Ticket,
  AlertTriangle,
  FileText,
  Mic,
  ArrowUpRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { useAuthSWR } from "@/lib/api/swr";
import type { SuperadminDashboardStats } from "@/lib/types/admin";

const mockStats: SuperadminDashboardStats = {
  totalAdmins: 0,
  totalTeachers: 0,
  totalStudents: 0,
  unassignedStudents: 0,
  adminPerformance: [],
  recentActivity: [],
  scoreTrend: [],
  invitationSummary: { total: 0, pending: 0, used: 0, expired: 0 },
};

export default function SuperadminDashboard() {
  const { data: rawStats, isLoading: loading } = useAuthSWR<SuperadminDashboardStats>("/api/superadmin/stats");
  const stats = rawStats ?? mockStats;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "管理者数", value: stats.totalAdmins, icon: Shield, color: "text-primary", bg: "bg-primary/10" },
    { label: "講師数", value: stats.totalTeachers, icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "生徒数", value: stats.totalStudents, icon: GraduationCap, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { label: "未割当生徒", value: stats.unassignedStudents, icon: UserX, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  ];

  const activityConfig: Record<string, { icon: React.ReactNode; border: string; bg: string }> = {
    essay_submit: {
      icon: <FileText className="size-4 text-sky-500" />,
      border: "border-l-sky-500",
      bg: "bg-sky-50 dark:bg-sky-950/30",
    },
    interview_complete: {
      icon: <Mic className="size-4 text-purple-500" />,
      border: "border-l-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    student_added: {
      icon: <UserPlus className="size-4 text-emerald-500" />,
      border: "border-l-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    student_assigned: {
      icon: <Users className="size-4 text-amber-500" />,
      border: "border-l-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  };

  const defaultActivityConfig = {
    icon: <Clock className="size-4 text-muted-foreground" />,
    border: "border-l-muted-foreground",
    bg: "bg-muted/30",
  };

  function timeAgo(timestamp: string) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "1時間以内";
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  }

  // BarChart data for admin performance
  const barData = stats.adminPerformance.map((a) => ({
    name: a.displayName.length > 6 ? a.displayName.slice(0, 6) + "…" : a.displayName,
    fullName: a.displayName,
    生徒数: a.studentCount,
    要注意: a.alertStudentCount,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Superadmin ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">システム全体の管理状況を確認できます</p>
        </div>
      </div>

      {/* Stat Cards - Enhanced */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {stat.label === "未割当生徒" && stat.value > 0 && (
                      <Badge variant="destructive" className="text-[10px]">要対応</Badge>
                    )}
                  </div>
                </div>
                <div className={`flex size-12 items-center justify-center rounded-full ${stat.bg}`}>
                  <stat.icon className={`size-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/superadmin/admins/new">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-4" /> 管理者追加
          </Button>
        </Link>
        <Link href="/superadmin/teachers/new">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-4" /> 講師追加
          </Button>
        </Link>
        <Link href="/superadmin/students/new">
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="size-4" /> 生徒追加
          </Button>
        </Link>
        <Link href="/superadmin/admins">
          <Button variant="outline" size="sm" className="gap-2">
            <Ticket className="size-4" /> 招待コード発行
          </Button>
        </Link>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpRight className="size-4" /> Admin View
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Admin Performance with BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              管理者別パフォーマンス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.adminPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">データがありません</p>
            ) : (
              <>
                {/* BarChart */}
                {barData.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid
                          strokeDasharray={GRID_STYLE.strokeDasharray}
                          stroke={GRID_STYLE.stroke}
                          opacity={GRID_STYLE.opacity}
                        />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="生徒数"
                          fill={CHART_COLORS.primary}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={CHART_ANIMATION.duration}
                          animationEasing={CHART_ANIMATION.easing}
                        />
                        <Bar
                          dataKey="要注意"
                          fill={CHART_COLORS.quinary}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={CHART_ANIMATION.duration}
                          animationEasing={CHART_ANIMATION.easing}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">名前</th>
                        <th className="px-4 py-2 text-center font-medium">ロール</th>
                        <th className="px-4 py-2 text-center font-medium">生徒数</th>
                        <th className="px-4 py-2 text-center font-medium">平均スコア</th>
                        <th className="px-4 py-2 text-center font-medium">要注意</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.adminPerformance.map((admin) => (
                        <tr key={admin.uid} className="border-b hover:bg-accent/50">
                          <td className="px-4 py-2">
                            <Link href={`/superadmin/admins/${admin.uid}`} className="font-medium hover:underline">
                              {admin.displayName}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant={admin.role === "admin" ? "default" : "secondary"}>
                              {admin.role === "admin" ? "管理者" : "講師"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-center">{admin.studentCount}</td>
                          <td className="px-4 py-2 text-center">
                            {admin.averageScore !== null ? (
                              <span className="font-bold">{admin.averageScore}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {admin.alertStudentCount > 0 ? (
                              <Badge variant="destructive">{admin.alertStudentCount}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Alert Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              要注意生徒（担当別）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.adminPerformance.filter((a) => a.alertStudentCount > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">要注意生徒はいません</p>
            ) : (
              <div className="space-y-3">
                {stats.adminPerformance
                  .filter((a) => a.alertStudentCount > 0)
                  .sort((a, b) => b.alertStudentCount - a.alertStudentCount)
                  .map((admin) => (
                    <div key={admin.uid} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{admin.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          担当 {admin.studentCount}名中 {admin.alertStudentCount}名が要注意
                        </p>
                      </div>
                      <Link href={`/superadmin/admins/${admin.uid}`}>
                        <Button variant="ghost" size="sm">
                          詳細 <ArrowUpRight className="ml-1 size-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity - Color-coded */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              最近のアクティビティ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">アクティビティはありません</p>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.slice(0, 8).map((activity) => {
                  const config = activityConfig[activity.type] ?? defaultActivityConfig;
                  return (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-3 rounded-md border-l-4 p-3 ${config.border} ${config.bg}`}
                    >
                      <div className="mt-0.5">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {activity.studentName && (
                            <span className="font-semibold">{activity.studentName}</span>
                          )}
                          {activity.adminName && (
                            <span className="text-xs text-muted-foreground"> ({activity.adminName})</span>
                          )}
                          <span className="text-muted-foreground"> {activity.description}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Trend (Recharts AreaChart) + Invitation Summary */}
        <div className="space-y-6">
          {/* Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4" />
                全体スコア推移（直近30日）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.scoreTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">データがありません</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.scoreTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray={GRID_STYLE.strokeDasharray}
                        stroke={GRID_STYLE.stroke}
                        opacity={GRID_STYLE.opacity}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="averageScore"
                        name="平均スコア"
                        stroke={CHART_COLORS.primary}
                        fill="url(#scoreFill)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                        animationEasing={CHART_ANIMATION.easing}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="size-4" />
                招待コード状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.invitationSummary.pending}
                  </p>
                  <p className="text-xs text-muted-foreground">有効</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {stats.invitationSummary.used}
                  </p>
                  <p className="text-xs text-muted-foreground">使用済み</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {stats.invitationSummary.expired}
                  </p>
                  <p className="text-xs text-muted-foreground">期限切れ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
