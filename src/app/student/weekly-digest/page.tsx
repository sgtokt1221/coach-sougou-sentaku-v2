"use client";

import Link from "next/link";
import { useAuthSWR } from "@/lib/api/swr";
import type { WeeklyDigest } from "@/lib/types/weekly-digest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Mic,
  Sparkles,
  MessageSquare,
  Target,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WeeklyDigestPage() {
  const { data: digest, isLoading } = useAuthSWR<WeeklyDigest>("/api/student/weekly-digest");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-muted-foreground text-center py-12">データを取得できませんでした。</p>
      </div>
    );
  }

  const periodLabel = `${formatDateShort(digest.periodStart)} 〜 ${formatDateShort(digest.periodEnd)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div>
        <h1 className="text-lg font-bold">今週のまとめ</h1>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>

      {/* 総評カード */}
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </div>
            <p className="text-sm leading-relaxed">{digest.overallMessage}</p>
          </div>
        </CardContent>
      </Card>

      {/* 活動サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="小論文"
          icon={FileText}
          count={digest.essayCount}
          unit="本"
          avgScore={digest.essayAvgScore}
          scoreChange={digest.essayScoreChange}
          iconColor="text-sky-600"
          iconBg="bg-sky-100 dark:bg-sky-950/40"
        />
        <StatCard
          label="面接"
          icon={Mic}
          count={digest.interviewCount}
          unit="回"
          avgScore={digest.interviewAvgScore}
          scoreChange={digest.interviewScoreChange}
          iconColor="text-violet-600"
          iconBg="bg-violet-100 dark:bg-violet-950/40"
        />
      </div>

      {/* TOP弱点 */}
      {digest.topWeaknesses.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Target className="size-3.5" />
              重点課題 TOP {digest.topWeaknesses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {digest.topWeaknesses.map((w, i) => (
              <div
                key={w.area}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  i === 0 ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20" : "border-border",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    i === 0
                      ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.area}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{w.count}回指摘</span>
                    {w.level === "critical" && (
                      <Badge variant="outline" className="text-[9px] border-red-300 text-red-600 px-1.5 py-0">
                        要改善
                      </Badge>
                    )}
                  </div>
                </div>
                <WeaknessIcon level={w.level} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 改善できた項目 */}
      {digest.improvements.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              改善できた項目
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {digest.improvements.map((imp) => (
              <div
                key={imp.area}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/10"
              >
                {imp.status === "resolved" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <TrendingUp className="size-4 shrink-0 text-blue-500" />
                )}
                <span className="text-sm flex-1">{imp.area}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    imp.status === "resolved"
                      ? "border-emerald-300 text-emerald-600"
                      : "border-blue-300 text-blue-600",
                  )}
                >
                  {imp.status === "resolved" ? "克服" : "改善中"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 次にやること */}
      <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <ArrowRight className="size-3.5" />
            次にやること
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed mb-1">{digest.nextAction.suggestion}</p>
          <p className="text-[11px] text-muted-foreground mb-3">{digest.nextAction.reason}</p>
          <Link
            href={digest.nextAction.href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            取り組む
            <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* コーチからのコメント */}
      {digest.coachComments.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              先生からのコメント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {digest.coachComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "rounded-xl border p-3 space-y-1",
                  !comment.read ? "border-primary/30 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{comment.createdByName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {comment.targetLabel}
                  </span>
                  {!comment.read && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                      未読
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{comment.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  icon: Icon,
  count,
  unit,
  avgScore,
  scoreChange,
  iconColor,
  iconBg,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  unit: string;
  avgScore: number | null;
  scoreChange: number;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex size-7 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={cn("size-3.5", iconColor)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {count}
          <span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span>
        </p>
        {avgScore != null && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground">
              平均 {avgScore}点
            </span>
            {scoreChange !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] font-medium",
                  scoreChange > 0 ? "text-emerald-600" : "text-red-500",
                )}
              >
                {scoreChange > 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {scoreChange > 0 ? "+" : ""}
                {scoreChange}
              </span>
            )}
            {scoreChange === 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Minus className="size-3" />
                変動なし
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeaknessIcon({ level }: { level: "critical" | "warning" | "new" }) {
  if (level === "critical") {
    return <AlertCircle className="size-5 shrink-0 text-red-500" />;
  }
  if (level === "warning") {
    return <AlertTriangle className="size-5 shrink-0 text-amber-500" />;
  }
  return <Sparkles className="size-4 shrink-0 text-blue-400" />;
}
