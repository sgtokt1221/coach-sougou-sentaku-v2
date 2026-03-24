"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Mail,
  School,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { authFetch } from "@/lib/api/client";
import type { StudentDetail } from "@/lib/types/admin";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";

const SCORE_LINES = [
  { key: "total", label: "合計", color: "hsl(var(--primary))" },
  { key: "structure", label: "構成", color: "#6366f1" },
  { key: "logic", label: "論理性", color: "#f59e0b" },
  { key: "expression", label: "表現力", color: "#10b981" },
  { key: "apAlignment", label: "AP合致度", color: "#ef4444" },
  { key: "originality", label: "独自性", color: "#8b5cf6" },
] as const;

function weaknessBadge(w: WeaknessRecord) {
  const level = getWeaknessReminderLevel(w);
  switch (level) {
    case "critical":
      return <Badge variant="destructive">要注意</Badge>;
    case "warning":
      return (
        <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
          警告
        </Badge>
      );
    case "improving":
      return (
        <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
          改善中
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-green-400 bg-green-50 text-green-700">
          解決済み
        </Badge>
      );
    default:
      return <Badge variant="secondary">-</Badge>;
  }
}

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllLines, setShowAllLines] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await authFetch(`/api/admin/students/${id}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">生徒データの取得に失敗しました</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/students")}>
              <ArrowLeft className="mr-1 size-4" />
              生徒一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, weaknesses, essays, scoreTrend } = detail;

  const chartData = scoreTrend.map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));

  const visibleLines = showAllLines ? SCORE_LINES : SCORE_LINES.slice(0, 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/students")}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">生徒詳細</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.school && (
              <div className="flex items-center gap-2 text-sm">
                <School className="size-4 text-muted-foreground" />
                <span>{profile.school}</span>
              </div>
            )}
            {profile.grade && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="size-4 text-muted-foreground" />
                <span>{profile.grade}年生</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {profile.targetUniversities.length > 0 ? (
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
        </CardContent>
      </Card>

      {/* Score Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              スコア推移
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllLines((v) => !v)}
            >
              {showAllLines ? "合計のみ" : "項目別も表示"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              まだデータがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={showAllLines ? [0, 50] : [0, 50]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                {showAllLines && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {visibleLines.map((line) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.label}
                    stroke={line.color}
                    strokeWidth={line.key === "total" ? 2 : 1.5}
                    dot={{ r: line.key === "total" ? 4 : 3 }}
                    activeDot={{ r: line.key === "total" ? 6 : 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Weaknesses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">弱点一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {weaknesses.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              弱点データなし
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">弱点項目</th>
                    <th className="px-4 py-3 text-center font-medium">指摘回数</th>
                    <th className="px-4 py-3 text-center font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {weaknesses.map((w) => (
                    <tr key={w.area} className="border-b">
                      <td className="px-4 py-3">{w.area}</td>
                      <td className="px-4 py-3 text-center">{w.count}回</td>
                      <td className="px-4 py-3 text-center">{weaknessBadge(w)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Essay History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            添削履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {essays.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              添削履歴なし
            </div>
          ) : (
            <div className="space-y-2">
              {essays.map((essay) => (
                <Link key={essay.id} href={`/student/essay/${essay.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                    <div>
                      <p className="font-medium">
                        {essay.targetUniversity} {essay.targetFaculty}
                      </p>
                      {essay.topic && (
                        <p className="text-xs text-muted-foreground">{essay.topic}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(essay.submittedAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div className="text-right">
                      {essay.scores ? (
                        <>
                          <p className={`text-lg font-bold ${scoreColor(essay.scores.total)}`}>
                            {essay.scores.total}
                          </p>
                          <p className="text-xs text-muted-foreground">/50</p>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {essay.status === "uploaded" ? "OCR待ち" : essay.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
