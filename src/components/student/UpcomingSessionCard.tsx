"use client";

import Link from "next/link";
import { Calendar, Clock, Video, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionCall } from "@/lib/hooks/useSessionCall";
import type { Session, SessionType } from "@/lib/types/session";
import type { StudentProfile } from "@/lib/types/user";

const TYPE_LABEL: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

interface FormattedDate {
  month: number;
  day: number;
  weekday: string;
  time: string;
  isToday: boolean;
  isTomorrow: boolean;
  diffHours: number;
}

function formatDate(iso: string): FormattedDate {
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

function dateLabelOf(when: FormattedDate): string {
  if (when.isToday) return "今日";
  if (when.isTomorrow) return "明日";
  return `${when.month}/${when.day} (${when.weekday})`;
}

export function UpcomingSessionCard() {
  const { userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const isCoachPlan =
    studentProfile?.plan === "coach" || studentProfile?.plan === "standard";

  const { data, isLoading } = useAuthSWR<{
    sessions?: Session[];
    session?: Session | null;
  }>("/api/student/sessions/upcoming", { refreshInterval: 5 * 60 * 1000 });

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }

  // sessions 配列が新しい形式。session は後方互換 fallback
  const sessions: Session[] =
    data?.sessions ?? (data?.session ? [data.session] : []);
  const next = sessions[0];
  const followUps = sessions.slice(1, 3); // 最大 2 件まで二次表示

  // セッション未予定: コーチプランの生徒には「ここに表示されます」プレースホルダーを出す
  if (!next) {
    if (!isCoachPlan) return null;
    return (
      <Card className="border-border/60 bg-muted/30 rounded-2xl border-dashed">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Calendar className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">
              次回のセッション予定はまだありません
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              担当コーチがスケジュールするとここに表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PrimarySessionCard session={next} />
      {followUps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {followUps.map((s) => (
            <CompactSessionRow key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 次回 1 件をフルカードで強調表示 */
function PrimarySessionCard({ session }: { session: Session }) {
  const { user } = useAuth();
  const router = useRouter();
  // 講師が通話を始めていたら、詳細ページを経由せずここから入れるようにする
  const activeCall = useSessionCall(user?.uid, session.id);
  const when = formatDate(session.scheduledAt);
  const dateLabel = dateLabelOf(when);
  const isInProgress = session.status === "in_progress";
  const isSoon = when.diffHours >= 0 && when.diffHours <= 1 && !isInProgress;

  return (
    <Link href={`/student/sessions/${session.id}`} className="group block">
      <Card
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          isInProgress
            ? "border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20"
            : isSoon
              ? "border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
              : "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 group-hover:border-teal-300 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/20"
        }`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex min-w-16 shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 ${
              isInProgress
                ? "bg-rose-500 text-white"
                : isSoon
                  ? "bg-amber-500 text-white"
                  : "bg-teal-500 text-white"
            }`}
          >
            <span className="text-[10px] font-medium tracking-wide uppercase opacity-90">
              {dateLabel}
            </span>
            <span className="mt-0.5 font-mono text-lg font-bold tabular-nums">
              {when.time}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isInProgress ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
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
                  className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                >
                  <Clock className="size-2.5" />
                  まもなく開始
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-teal-200 bg-teal-50 text-[10px] text-teal-700"
                >
                  <Calendar className="size-2.5" />
                  次回の授業
                </Badge>
              )}
              <span className="text-muted-foreground text-[11px]">
                {TYPE_LABEL[session.type] ?? "授業"}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-medium">
              {session.teacherName ?? "担当講師"}
              {session.prepPlan?.goal && (
                <span className="text-muted-foreground">
                  {" · "}
                  {session.prepPlan.goal.slice(0, 40)}
                </span>
              )}
            </p>
          </div>
          {/* 通話中なら直接入れるようにする。無いときは詳細へ進む矢印 */}
          {activeCall && (isInProgress || isSoon) ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/call/${activeCall.id}`);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
                isInProgress
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              <Video className="size-3.5" />
              通話に参加
            </button>
          ) : (
            <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 transition-colors" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/** 「その次以降」のセッションを 1 行コンパクトに表示 */
function CompactSessionRow({ session }: { session: Session }) {
  const when = formatDate(session.scheduledAt);
  return (
    <Link
      href={`/student/sessions/${session.id}`}
      className="group border-border/60 bg-background/80 hover:border-border hover:bg-background flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
    >
      <div className="text-muted-foreground flex min-w-[88px] shrink-0 items-center gap-1.5 text-xs">
        <Calendar className="size-3.5" />
        <span className="font-medium tabular-nums">
          {dateLabelOf(when)} {when.time}
        </span>
      </div>
      <span className="text-muted-foreground shrink-0 text-[11px]">
        {TYPE_LABEL[session.type] ?? "授業"}
      </span>
      <span className="text-foreground/80 flex-1 truncate text-xs">
        {session.teacherName ?? "担当講師"}
      </span>
      <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0" />
    </Link>
  );
}
