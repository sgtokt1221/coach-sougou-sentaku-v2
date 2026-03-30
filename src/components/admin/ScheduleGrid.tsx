"use client";

import { useMemo } from "react";
import { User, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlot, Assignment } from "@/lib/types/schedule";

const DAYS = ["月", "火", "水", "木", "金", "土"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6]; // 月=1 ~ 土=6

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function slotKey(day: number, time: string) {
  return `${day}-${time}`;
}

function endTimeFor(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  if (m === 30) {
    return `${String(h + 1).padStart(2, "0")}:00`;
  }
  return `${String(h).padStart(2, "0")}:30`;
}

interface ScheduleGridProps {
  teacherSlots?: TimeSlot[];
  studentSlots?: TimeSlot[];
  assignments?: Assignment[];
  selectedTeacherId?: string;
  selectedStudentId?: string;
  onCellClick?: (dayOfWeek: number, startTime: string, endTime: string) => void;
  mode?: "view" | "edit-availability";
  editSlots?: Set<string>;
  onToggleSlot?: (dayOfWeek: number, startTime: string) => void;
}

export function ScheduleGrid({
  teacherSlots = [],
  studentSlots = [],
  assignments = [],
  selectedTeacherId,
  selectedStudentId,
  onCellClick,
  mode = "view",
  editSlots,
  onToggleSlot,
}: ScheduleGridProps) {
  const teacherSet = useMemo(() => {
    const s = new Set<string>();
    for (const slot of teacherSlots) {
      s.add(slotKey(slot.dayOfWeek, slot.startTime));
    }
    return s;
  }, [teacherSlots]);

  const studentSet = useMemo(() => {
    const s = new Set<string>();
    for (const slot of studentSlots) {
      s.add(slotKey(slot.dayOfWeek, slot.startTime));
    }
    return s;
  }, [studentSlots]);

  const assignmentMap = useMemo(() => {
    const m = new Map<string, Assignment>();
    for (const a of assignments) {
      m.set(slotKey(a.dayOfWeek, a.startTime), a);
    }
    return m;
  }, [assignments]);

  function handleClick(day: number, time: string) {
    if (mode === "edit-availability" && onToggleSlot) {
      onToggleSlot(day, time);
      return;
    }
    if (onCellClick) {
      onCellClick(day, time, endTimeFor(time));
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div
        className="grid min-w-[700px]"
        style={{
          gridTemplateColumns: "64px repeat(6, 1fr)",
          gridTemplateRows: `40px repeat(${TIME_SLOTS.length}, 36px)`,
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-10 border-b border-r border-border bg-muted/50" />
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "flex items-center justify-center border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground",
              i < DAYS.length - 1 && "border-r"
            )}
          >
            {day}
          </div>
        ))}

        {/* Time rows */}
        {TIME_SLOTS.map((time) => (
          <>
            {/* Time label */}
            <div
              key={`label-${time}`}
              className="sticky left-0 z-10 flex items-center justify-end border-b border-r border-border bg-background pr-2 text-[10px] text-muted-foreground"
            >
              {time}
            </div>

            {/* Day cells */}
            {DAY_VALUES.map((day, di) => {
              const key = slotKey(day, time);
              const isTeacher = teacherSet.has(key);
              const isStudent = studentSet.has(key);
              const isMatch = isTeacher && isStudent;
              const assignment = assignmentMap.get(key);
              const isEditSelected = editSlots?.has(key);

              return (
                <button
                  key={`${day}-${time}`}
                  type="button"
                  onClick={() => handleClick(day, time)}
                  className={cn(
                    "relative flex items-center justify-center border-b border-border text-[10px] transition-colors",
                    di < DAY_VALUES.length - 1 && "border-r",
                    // Edit mode
                    mode === "edit-availability" && isEditSelected && "bg-emerald-100 dark:bg-emerald-900/40",
                    mode === "edit-availability" && !isEditSelected && "hover:bg-muted/40",
                    // View mode colors
                    mode === "view" && assignment && "bg-purple-100 dark:bg-purple-900/30",
                    mode === "view" && !assignment && isMatch && "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 cursor-pointer",
                    mode === "view" && !assignment && isTeacher && !isStudent && "bg-emerald-50 dark:bg-emerald-900/20",
                    mode === "view" && !assignment && isStudent && !isTeacher && "bg-blue-50 dark:bg-blue-900/20",
                    mode === "view" && !assignment && !isTeacher && !isStudent && "hover:bg-muted/20"
                  )}
                >
                  {assignment && (
                    <span className="flex items-center gap-0.5 truncate px-1">
                      {selectedTeacherId ? (
                        <>
                          <User className="h-3 w-3 shrink-0 text-purple-600" />
                          <span className="truncate text-purple-700 dark:text-purple-300">
                            {assignment.studentName}
                          </span>
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-3 w-3 shrink-0 text-purple-600" />
                          <span className="truncate text-purple-700 dark:text-purple-300">
                            {assignment.teacherName}
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        {mode === "edit-availability" ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
            空きコマ（クリックで切替）
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40" />
              講師空き
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-100 dark:bg-blue-900/40" />
              生徒希望
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 dark:bg-amber-900/40" />
              マッチ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-purple-100 dark:bg-purple-900/40" />
              アサイン済み
            </span>
          </>
        )}
      </div>
    </div>
  );
}
