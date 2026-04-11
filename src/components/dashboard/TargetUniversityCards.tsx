"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  CalendarClock,
  ArrowRight,
  Settings,
  Trophy,
  FileEdit,
  ScrollText,
} from "lucide-react";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  schedule: {
    applicationStart: string;
    applicationEnd: string;
    examDate: string;
    resultDate: string;
  };
}

interface EventInfo {
  type: string;
  date: string;
  daysLeft: number;
  icon: React.ComponentType<{ className?: string }>;
}

function getNextEvent(schedule: ResolvedUniversity["schedule"]): EventInfo | null {
  if (!schedule) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events: { type: string; date: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: "出願開始", date: schedule.applicationStart, icon: FileEdit },
    { type: "出願締切", date: schedule.applicationEnd, icon: ScrollText },
    { type: "試験日", date: schedule.examDate, icon: CalendarClock },
    { type: "合格発表", date: schedule.resultDate, icon: Trophy },
  ].filter((ev) => ev.date);

  for (const ev of events) {
    const target = new Date(ev.date + "T00:00:00");
    const daysLeft = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft >= 0) {
      return { ...ev, daysLeft };
    }
  }
  return null;
}

/**
 * カウントダウンの見た目を日数によって切り替える。
 * 7日以内: 赤、30日以内: 橙、それ以上: 青緑 (teal)
 */
function countdownStyle(daysLeft: number): { bg: string; text: string; ring: string; label?: string } {
  if (daysLeft === 0) {
    return {
      bg: "from-rose-500 to-rose-600",
      text: "text-white",
      ring: "ring-rose-300/60",
      label: "本日",
    };
  }
  if (daysLeft <= 7) {
    return {
      bg: "from-rose-500 to-rose-600",
      text: "text-white",
      ring: "ring-rose-300/60",
      label: "締切間近",
    };
  }
  if (daysLeft <= 30) {
    return {
      bg: "from-amber-400 to-amber-500",
      text: "text-white",
      ring: "ring-amber-300/60",
    };
  }
  return {
    bg: "from-teal-500 to-emerald-600",
    text: "text-white",
    ring: "ring-teal-300/60",
  };
}

interface Props {
  targetUniversities: string[];
}

export function TargetUniversityCards({ targetUniversities }: Props) {
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUniversities.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchResolved() {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${targetUniversities.join(",")}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResolved(data.resolved ?? []);
      } catch {
        setResolved([]);
      } finally {
        setLoading(false);
      }
    }
    fetchResolved();
  }, [targetUniversities]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (targetUniversities.length === 0) {
    return (
      <Link href="/student/settings">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="size-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">志望校を設定しましょう</p>
              <p className="text-sm text-muted-foreground">
                志望校を設定すると、カウントダウンやスケジュールが表示されます
              </p>
            </div>
            <Settings className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {resolved.map((item) => {
        const nextEvent = getNextEvent(item.schedule);
        const cd = nextEvent ? countdownStyle(nextEvent.daysLeft) : null;
        const NextIcon = nextEvent?.icon ?? CalendarClock;

        return (
          <Link
            key={`${item.universityId}:${item.facultyId}`}
            href={`/student/universities/${item.universityId}/${item.facultyId}`}
            className="block group"
          >
            <Card className="relative overflow-hidden rounded-2xl border-border/60 group-hover:border-primary/40 group-hover:shadow-xl transition-all duration-300">
              {/* 背景の装飾グラデーション */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.04] pointer-events-none" />
              <div className="absolute top-0 right-0 size-40 bg-gradient-to-bl from-primary/[0.08] to-transparent rounded-full blur-3xl pointer-events-none" />

              <CardContent className="relative p-5 lg:p-6 space-y-4">
                {/* ヘッダー: 大学名 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="size-4 text-primary shrink-0" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        志望校
                      </p>
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground leading-tight truncate">
                      {item.universityName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {item.facultyName}
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                </div>

                {/* カウントダウン: 大きく・太く・スタイリッシュ */}
                {nextEvent && cd ? (
                  <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                    <div
                      className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${cd.bg} ${cd.text} px-5 py-3 shadow-lg ring-4 ${cd.ring} min-w-[110px]`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
                        残り
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl lg:text-5xl font-black tabular-nums leading-none">
                          {nextEvent.daysLeft}
                        </span>
                        <span className="text-sm font-bold opacity-90">日</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <NextIcon className="size-3.5" />
                        <span>次のイベント</span>
                      </div>
                      <p className="text-base lg:text-lg font-bold text-foreground leading-tight">
                        {nextEvent.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {new Date(nextEvent.date + "T00:00:00").toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </p>
                      {cd.label && (
                        <span
                          className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${cd.bg} ${cd.text}`}
                        >
                          {cd.label}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-sm text-muted-foreground">
                    <Trophy className="size-4" />
                    全日程終了
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
