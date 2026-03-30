"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  CalendarClock,
  ArrowRight,
  Settings,
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
}

function getNextEvent(schedule: ResolvedUniversity["schedule"]): EventInfo | null {
  if (!schedule) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events: { type: string; date: string }[] = [
    { type: "出願開始", date: schedule.applicationStart },
    { type: "出願締切", date: schedule.applicationEnd },
    { type: "試験日", date: schedule.examDate },
    { type: "合格発表", date: schedule.resultDate },
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

function countdownColor(daysLeft: number): string {
  if (daysLeft <= 7) return "bg-rose-100 text-rose-700 border-rose-200";
  if (daysLeft <= 30) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
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
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-64 flex-shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (targetUniversities.length === 0) {
    return (
      <Link href="/student/settings">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <GraduationCap className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">志望校を設定しましょう</p>
              <p className="text-xs text-muted-foreground">
                志望校を設定すると、カウントダウンやスケジュールが表示されます
              </p>
            </div>
            <Settings className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
      {resolved.map((item) => {
        const nextEvent = getNextEvent(item.schedule);

        return (
          <Link
            key={`${item.universityId}:${item.facultyId}`}
            href={`/student/universities/${item.universityId}/${item.facultyId}`}
          >
            <Card className="w-64 flex-shrink-0 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.universityName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.facultyName}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {nextEvent ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {nextEvent.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {nextEvent.daysLeft <= 7 && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0"
                        >
                          締切間近
                        </Badge>
                      )}
                      <span
                        className={`text-xs font-bold rounded-md px-2 py-0.5 border ${countdownColor(nextEvent.daysLeft)}`}
                      >
                        {nextEvent.daysLeft}日
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    全日程終了
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
