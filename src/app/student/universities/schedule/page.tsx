"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, GraduationCap } from "lucide-react";

interface ScheduleEvent {
  universityName: string;
  facultyName: string;
  type: "出願開始" | "出願締切" | "試験日" | "合格発表";
  date: string;
  daysLeft: number;
}

type EventType = ScheduleEvent["type"];

function eventTypeVariant(type: EventType): "default" | "secondary" | "outline" | "destructive" {
  if (type === "出願締切") return "destructive";
  if (type === "試験日") return "default";
  if (type === "合格発表") return "secondary";
  return "outline";
}

function daysLeftColor(days: number): string {
  if (days < 0) return "text-muted-foreground";
  if (days <= 7) return "text-rose-600 dark:text-rose-400 font-bold";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function daysLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}日前に終了`;
  if (days === 0) return "今日";
  return `あと${days}日`;
}

function groupByMonth(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const map = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const month = event.date.slice(0, 7); // "2025-09"
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(event);
  }
  return map;
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${parseInt(month)}月`;
}

function EventCard({ event }: { event: ScheduleEvent }) {
  const isUrgent = event.daysLeft >= 0 && event.daysLeft <= 30;
  return (
    <Card className={isUrgent ? "border-yellow-300 bg-yellow-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={eventTypeVariant(event.type)}>{event.type}</Badge>
              {isUrgent && event.daysLeft > 0 && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-400 text-xs">
                  もうすぐ
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <GraduationCap className="size-3 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{event.universityName}</span>
              <span className="text-xs text-muted-foreground">{event.facultyName}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="size-3 text-muted-foreground" />
              <span>{event.date}</span>
            </div>
            <div className={`flex items-center gap-1 text-xs mt-0.5 justify-end ${daysLeftColor(event.daysLeft)}`}>
              <Clock className="size-3" />
              <span>{daysLeftLabel(event.daysLeft)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i}>
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            {[0, 1, 2].map((j) => (
              <Card key={j}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error("スケジュール取得に失敗しました");
        const data: { events: ScheduleEvent[] } = await res.json();
        setEvents(data.events);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const grouped = events ? groupByMonth(events) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-8">
      <div className="flex items-center gap-2 mb-5 lg:mb-6">
        <Calendar className="size-6 text-primary" />
        <h1 className="text-xl font-bold">出願スケジュール</h1>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded p-3 mb-4">{error}</p>
      )}

      {loading && <LoadingSkeleton />}

      {!loading && events !== null && events.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Calendar className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              志望校を設定するとスケジュールが表示されます
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && grouped && grouped.size > 0 && (
        <div className="space-y-5 lg:space-y-8">
          {Array.from(grouped.entries()).map(([month, monthEvents]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {formatMonth(month)}
              </h2>
              <div className="space-y-2">
                {monthEvents.map((event, i) => (
                  <EventCard key={`${event.universityName}-${event.type}-${i}`} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
