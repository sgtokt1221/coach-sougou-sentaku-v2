"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import {
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_LABELS,
  type CalendarEvent,
} from "@/lib/types/admin-calendar";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** 月カレンダーグリッドに表示する全日付 (前月末 + 当月 + 翌月頭, 6週分) */
function buildGrid(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const leadDays = start.getDay(); // 日曜始まり
  const totalDays = leadDays + end.getDate();
  const rows = Math.ceil(totalDays / 7);
  const cellCount = rows * 7;

  const days: Date[] = [];
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - leadDays);
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export function AdminCalendar() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const gridDays = useMemo(() => buildGrid(anchor), [anchor]);
  const fromStr = ymd(gridDays[0]);
  const toStr = ymd(gridDays[gridDays.length - 1]);

  const { data, isLoading } = useAuthSWR<{ events: CalendarEvent[] }>(
    `/api/admin/calendar?from=${fromStr}&to=${toStr}`
  );
  const events = data?.events ?? [];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const todayStr = ymd(new Date());
  const selectedEvents = selectedDate
    ? eventsByDate.get(selectedDate) ?? []
    : [];

  const monthLabel = `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`;

  const shiftMonth = (delta: number) => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const goToday = () => {
    setAnchor(new Date());
    setSelectedDate(todayStr);
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4" />
          カレンダー
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(-1)}
            aria-label="前月"
            className="cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm font-medium">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(1)}
            aria-label="翌月"
            className="cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="ml-1 cursor-pointer"
          >
            今日
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px rounded-xl border bg-border overflow-hidden">
              {WEEKDAY_LABELS.map((label, idx) => (
                <div
                  key={label}
                  className={`bg-muted/60 py-1.5 text-center text-xs font-medium ${
                    idx === 0
                      ? "text-red-600"
                      : idx === 6
                      ? "text-blue-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
              {gridDays.map((d) => {
                const dateStr = ymd(d);
                const isCurrentMonth = d.getMonth() === anchor.getMonth();
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvents = eventsByDate.get(dateStr) ?? [];
                const visible = dayEvents.slice(0, 2);
                const extraCount = dayEvents.length - visible.length;
                return (
                  <button
                    key={dateStr}
                    onClick={() =>
                      setSelectedDate(isSelected ? null : dateStr)
                    }
                    className={`relative bg-card min-h-[4.5rem] p-1.5 text-left cursor-pointer transition-colors hover:bg-muted/40 ${
                      isSelected ? "bg-muted/60 ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <div
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        !isCurrentMonth
                          ? "text-muted-foreground/50"
                          : isToday
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {visible.map((ev) => (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-white truncate ${
                            CALENDAR_EVENT_COLORS[ev.type]
                          }`}
                          title={ev.label}
                        >
                          <span className="truncate">{ev.label}</span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="px-1 text-[10px] text-muted-foreground">
                          +{extraCount} 件
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {selectedDate && selectedEvents.length > 0 && (
                <motion.div
                  key={selectedDate}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl border bg-muted/30 p-3"
                >
                  <div className="mb-2 text-sm font-medium">
                    {selectedDate} の予定
                  </div>
                  <div className="space-y-2">
                    {selectedEvents.map((ev) => {
                      const body = (
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1 inline-block size-2 rounded-full ${CALENDAR_EVENT_COLORS[ev.type]}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {ev.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {CALENDAR_EVENT_LABELS[ev.type]}
                              {!ev.allDay &&
                                ` ・ ${new Date(ev.startAt).toLocaleTimeString(
                                  "ja-JP",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}`}
                            </div>
                            {ev.studentNames.length > 0 && ev.type !== "session" && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                志望: {ev.studentNames.slice(0, 5).join("、")}
                                {ev.studentNames.length > 5 &&
                                  ` 他${ev.studentNames.length - 5}名`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      return ev.href ? (
                        <Link
                          key={ev.id}
                          href={ev.href}
                          className="block rounded-lg bg-card p-2 hover:bg-muted/50 transition-colors"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div
                          key={ev.id}
                          className="rounded-lg bg-card p-2"
                        >
                          {body}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </CardContent>
    </Card>
  );
}
