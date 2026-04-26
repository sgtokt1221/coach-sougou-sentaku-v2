"use client";

import Link from "next/link";
import { Calendar, Clock, Video, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import type { Session, SessionType } from "@/lib/types/session";
import type { StudentProfile } from "@/lib/types/user";

const TYPE_LABEL: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

function formatDate(iso: string): {
  month: number;
  day: number;
  weekday: string;
  time: string;
  isToday: boolean;
  isTomorrow: boolean;
  diffHours: number;
} {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: weekdays[d.getDay()],
    time,
    isToday: sessionDay.getTime() === today.getTime(),
    isTomorrow: sessionDay.getTime() === tomorrow.getTime(),
    diffHours,
  };
}

export function UpcomingSessionCard() {
  const { userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const isCoachPlan =
    studentProfile?.plan === "coach" || studentProfile?.plan === "standard";

  const { data, isLoading } = useAuthSWR<{ session: Session | null }>(
    "/api/student/sessions/upcoming",
    { refreshInterval: 5 * 60 * 1000 },
  );

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }

  const session = data?.session;

  // セッション未予定: コーチプランの生徒には「ここに表示されます」プレースホルダーを出す
  if (!session) {
    if (!isCoachPlan) return null;
    return (
      <Card className="rounded-2xl border-dashed border-border/60 bg-muted/30">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              次回のセッション予定はまだありません
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              担当コーチがスケジュールするとここに表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const when = formatDate(session.scheduledAt);
  const dateLabel = when.isToday
    ? "今日"
    : when.isTomorrow
      ? "明日"
      : `${when.month}/${when.day} (${when.weekday})`;

  const isInProgress = session.status === "in_progress";
  const isSoon = when.diffHours >= 0 && when.diffHours <= 1 && !isInProgress;

  return (
    <Link
      href={`/student/sessions/${session.id}`}
      className="block group"
    >
      <Card
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          isInProgress
            ? "border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20"
            : isSoon
              ? "border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
              : "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/20 group-hover:border-teal-300"
        }`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 shrink-0 min-w-16 ${
              isInProgress
                ? "bg-rose-500 text-white"
                : isSoon
                  ? "bg-amber-500 text-white"
                  : "bg-teal-500 text-white"
            }`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
              {dateLabel}
            </span>
            <span className="text-lg font-bold font-mono tabular-nums mt-0.5">
              {when.time}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isInProgress ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-rose-700 text-[10px]"
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                  授業中
                </Badge>
              ) : isSoon ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-200 bg-amber-50 text-amber-700 text-[10px]"
                >
                  <Clock className="size-2.5" />
                  まもなく開始
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-teal-200 bg-teal-50 text-teal-700 text-[10px]"
                >
                  <Calendar className="size-2.5" />
                  次回の授業
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">
                {TYPE_LABEL[session.type] ?? "授業"}
              </span>
            </div>
            <p className="text-sm font-medium mt-1 truncate">
              {session.teacherName ?? "担当講師"}
              {session.prepPlan?.goal && (
                <span className="text-muted-foreground">
                  {" · "}
                  {session.prepPlan.goal.slice(0, 40)}
                </span>
              )}
            </p>
          </div>
          {/* 開始 1 時間以内 + Meet リンクありなら、詳細ページを経由せず直接 Meet を開く */}
          {session.meetLink && (isInProgress || isSoon) ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(session.meetLink, "_blank", "noopener,noreferrer");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm shrink-0 transition-colors ${
                isInProgress
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              <Video className="size-3.5" />
              Meet に参加
            </button>
          ) : (
            <ArrowUpRight className="size-5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
