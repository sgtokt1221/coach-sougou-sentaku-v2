"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { isHoliday } from "japanese-holidays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
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

function dateFromYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 月カレンダーグリッドに表示する全日付 (前月末 + 当月 + 翌月頭, 6週分) */
function buildGrid(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const leadDays = start.getDay();
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

interface FormState {
  title: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  allDay: true,
  startTime: "",
  endTime: "",
  location: "",
  description: "",
};

export function AdminCalendar() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const gridDays = useMemo(() => buildGrid(anchor), [anchor]);
  const fromStr = ymd(gridDays[0]);
  const toStr = ymd(gridDays[gridDays.length - 1]);

  const { data, isLoading, mutate } = useAuthSWR<{ events: CalendarEvent[] }>(
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
  const dialogEvents = dialogDate ? eventsByDate.get(dialogDate) ?? [] : [];
  const dialogHolidayLabel = dialogDate
    ? dialogEvents.find((e) => e.type === "holiday")?.label
    : undefined;
  const dialogNonHolidayEvents = dialogEvents.filter((e) => e.type !== "holiday");

  const monthLabel = `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`;

  const shiftMonth = (delta: number) => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setDialogDate(null);
  };

  const goToday = () => {
    setAnchor(new Date());
    setDialogDate(todayStr);
  };

  const openNewForm = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (ev: CalendarEvent) => {
    if (ev.type !== "custom" || !ev.adminEventId) return;
    setEditingId(ev.adminEventId);
    const localStart = new Date(ev.startAt);
    const localEnd = new Date(ev.endAt);
    setFormState({
      title: ev.label,
      allDay: ev.allDay,
      startTime: ev.allDay
        ? ""
        : `${String(localStart.getHours()).padStart(2, "0")}:${String(localStart.getMinutes()).padStart(2, "0")}`,
      endTime: ev.allDay
        ? ""
        : `${String(localEnd.getHours()).padStart(2, "0")}:${String(localEnd.getMinutes()).padStart(2, "0")}`,
      location: ev.location ?? "",
      description: ev.description ?? "",
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!dialogDate) return;
    if (!formState.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: formState.title.trim(),
        date: dialogDate,
        allDay: formState.allDay,
        startTime: formState.allDay ? undefined : formState.startTime || undefined,
        endTime: formState.allDay ? undefined : formState.endTime || undefined,
        location: formState.location.trim() || undefined,
        description: formState.description.trim() || undefined,
      };
      const url = editingId
        ? `/api/admin/calendar/events/${editingId}`
        : `/api/admin/calendar/events`;
      const method = editingId ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("保存に失敗");
      await mutate();
      setFormOpen(false);
      setEditingId(null);
      setFormState(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (ev: CalendarEvent) => {
    if (!ev.adminEventId) return;
    if (!confirm(`「${ev.label}」を削除しますか?`)) return;
    setDeletingId(ev.adminEventId);
    try {
      const res = await authFetch(
        `/api/admin/calendar/events/${ev.adminEventId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("削除失敗");
      await mutate();
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
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
                const weekday = d.getDay();
                const holidayName = isHoliday(d, true);
                const dayEvents = eventsByDate.get(dateStr) ?? [];
                const nonHolidayEvents = dayEvents.filter(
                  (e) => e.type !== "holiday"
                );
                const visible = nonHolidayEvents.slice(0, 2);
                const extraCount = nonHolidayEvents.length - visible.length;
                const dateTextColor = !isCurrentMonth
                  ? "text-muted-foreground/50"
                  : isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : holidayName || weekday === 0
                  ? "text-red-600"
                  : weekday === 6
                  ? "text-blue-600"
                  : "text-foreground";
                return (
                  <button
                    key={dateStr}
                    onClick={() => setDialogDate(dateStr)}
                    className="relative bg-card min-h-[4.5rem] p-1.5 text-left cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${dateTextColor}`}
                      >
                        {d.getDate()}
                      </div>
                      {holidayName && (
                        <span className="truncate text-[10px] text-red-600">
                          {holidayName}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {visible.map((ev) => (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-white truncate ${CALENDAR_EVENT_COLORS[ev.type]}`}
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
          )}
        </CardContent>
      </Card>

      {/* Date detail dialog */}
      <Dialog
        open={!!dialogDate}
        onOpenChange={(open) => !open && setDialogDate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogDate &&
                (() => {
                  const d = dateFromYmd(dialogDate);
                  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY_LABELS[d.getDay()]})`;
                })()}
            </DialogTitle>
            {dialogHolidayLabel && (
              <DialogDescription className="text-red-600">
                祝日: {dialogHolidayLabel}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-2">
            {dialogNonHolidayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                この日の予定はありません。
              </p>
            ) : (
              dialogNonHolidayEvents.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  onEdit={() => openEditForm(ev)}
                  onDelete={() => deleteEvent(ev)}
                  deleting={deletingId === ev.adminEventId}
                />
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={openNewForm}
              className="w-full sm:w-auto cursor-pointer"
            >
              <Plus className="mr-1 size-4" />
              予定を追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event create/edit form */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingId(null);
            setFormState(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "予定を編集" : "予定を追加"}
            </DialogTitle>
            <DialogDescription>
              {dialogDate &&
                (() => {
                  const d = dateFromYmd(dialogDate);
                  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ev-title">タイトル *</Label>
              <Input
                id="ev-title"
                value={formState.title}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, title: e.target.value }))
                }
                placeholder="例: 保護者説明会"
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ev-allday" className="cursor-pointer">
                終日
              </Label>
              <Switch
                id="ev-allday"
                checked={formState.allDay}
                onCheckedChange={(checked) =>
                  setFormState((s) => ({ ...s, allDay: checked }))
                }
              />
            </div>

            {!formState.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ev-start">開始</Label>
                  <Input
                    id="ev-start"
                    type="time"
                    value={formState.startTime}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, startTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-end">終了</Label>
                  <Input
                    id="ev-end"
                    type="time"
                    value={formState.endTime}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, endTime: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ev-location">場所</Label>
              <Input
                id="ev-location"
                value={formState.location}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, location: e.target.value }))
                }
                placeholder="(任意)"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-desc">メモ</Label>
              <Textarea
                id="ev-desc"
                value={formState.description}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, description: e.target.value }))
                }
                rows={3}
                placeholder="(任意)"
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="cursor-pointer"
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              onClick={submitForm}
              disabled={saving || !formState.title.trim()}
              className="cursor-pointer"
            >
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EventRowProps {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function EventRow({ event: ev, onEdit, onDelete, deleting }: EventRowProps) {
  const body = (
    <div className="flex items-start gap-2 min-w-0 flex-1">
      <span
        className={`mt-1 inline-block size-2 shrink-0 rounded-full ${CALENDAR_EVENT_COLORS[ev.type]}`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{ev.label}</div>
        <div className="text-xs text-muted-foreground">
          {CALENDAR_EVENT_LABELS[ev.type]}
          {!ev.allDay &&
            ` ・ ${new Date(ev.startAt).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
        </div>
        {ev.location && (
          <div className="text-xs text-muted-foreground truncate">
            場所: {ev.location}
          </div>
        )}
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

  const isCustom = ev.type === "custom";

  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-2">
      {ev.href ? (
        <Link
          href={ev.href}
          className="min-w-0 flex-1 rounded hover:bg-muted/50 -m-1 p-1 transition-colors"
        >
          {body}
        </Link>
      ) : (
        body
      )}
      {isCustom && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={onEdit}
            aria-label="編集"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={deleting}
            aria-label="削除"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
