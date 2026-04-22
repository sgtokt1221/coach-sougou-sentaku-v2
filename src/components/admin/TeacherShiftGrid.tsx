"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShiftSlot } from "@/lib/types/teacher-shift";

interface TeacherShiftGridProps {
  teacherId: string;
  month: string;
  initialSlots?: ShiftSlot[];
  onSave: (slots: ShiftSlot[]) => void;
  readonly?: boolean;
}

const DAYS = ["月", "火", "水", "木", "金", "土"];
const TIMES = Array.from({ length: 26 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export function TeacherShiftGrid({
  teacherId,
  month,
  initialSlots = [],
  onSave,
  readonly = false,
}: TeacherShiftGridProps) {
  // 利用不可セルをSetで管理（逆状態管理）
  const [unavailableCells, setUnavailableCells] = useState<Set<string>>(() => {
    const allCells = new Set<string>();

    // すべてのセルを初期状態で利用不可とする
    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      for (let timeIndex = 0; timeIndex < 26; timeIndex++) {
        allCells.add(`${dayIndex}-${timeIndex}`);
      }
    }

    // 初期スロットがある場合は、該当セルを利用可能にする
    initialSlots.forEach(slot => {
      const dayIndex = slot.dayOfWeek === 0 ? -1 : slot.dayOfWeek - 1; // 0=日曜は除外、1=月曜→0
      if (dayIndex >= 0 && dayIndex < 6) {
        const startTimeIndex = TIMES.indexOf(slot.startTime);
        const endTimeIndex = TIMES.indexOf(slot.endTime);

        if (startTimeIndex !== -1 && endTimeIndex !== -1) {
          for (let i = startTimeIndex; i < endTimeIndex; i++) {
            allCells.delete(`${dayIndex}-${i}`);
          }
        }
      }
    });

    return allCells;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<"available" | "unavailable" | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellKey = useCallback((dayIndex: number, timeIndex: number) =>
    `${dayIndex}-${timeIndex}`, []);

  const isCellAvailable = useCallback((dayIndex: number, timeIndex: number) =>
    !unavailableCells.has(getCellKey(dayIndex, timeIndex)), [unavailableCells, getCellKey]);

  const handleCellInteraction = useCallback((dayIndex: number, timeIndex: number, isTouch = false) => {
    if (readonly) return;

    const cellKey = getCellKey(dayIndex, timeIndex);
    const isCurrentlyAvailable = isCellAvailable(dayIndex, timeIndex);
    const newState = isCurrentlyAvailable ? "unavailable" : "available";

    setUnavailableCells(prev => {
      const next = new Set(prev);
      if (newState === "available") {
        next.delete(cellKey);
      } else {
        next.add(cellKey);
      }
      return next;
    });

    if (!isTouch) {
      setDragState(newState);
    }
  }, [readonly, getCellKey, isCellAvailable]);

  const handleMouseDown = useCallback((dayIndex: number, timeIndex: number) => {
    handleCellInteraction(dayIndex, timeIndex);
    setIsDragging(true);
  }, [handleCellInteraction]);

  const handleMouseEnter = useCallback((dayIndex: number, timeIndex: number) => {
    if (isDragging && dragState && !readonly) {
      const cellKey = getCellKey(dayIndex, timeIndex);
      setUnavailableCells(prev => {
        const next = new Set(prev);
        if (dragState === "available") {
          next.delete(cellKey);
        } else {
          next.add(cellKey);
        }
        return next;
      });
    }
  }, [isDragging, dragState, readonly, getCellKey]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragState(null);
  }, []);

  // タッチイベント対応
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragState || readonly) return;

    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.dataset.dayIndex && element.dataset.timeIndex) {
      const dayIndex = parseInt(element.dataset.dayIndex, 10);
      const timeIndex = parseInt(element.dataset.timeIndex, 10);
      const cellKey = getCellKey(dayIndex, timeIndex);

      setUnavailableCells(prev => {
        const next = new Set(prev);
        if (dragState === "available") {
          next.delete(cellKey);
        } else {
          next.add(cellKey);
        }
        return next;
      });
    }
  }, [isDragging, dragState, readonly, getCellKey]);

  const convertToSlots = useCallback((): ShiftSlot[] => {
    const slots: ShiftSlot[] = [];

    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      let slotStart = -1;

      for (let timeIndex = 0; timeIndex <= 26; timeIndex++) {
        const isAvailable = timeIndex < 26 ? isCellAvailable(dayIndex, timeIndex) : false;

        if (isAvailable && slotStart === -1) {
          slotStart = timeIndex;
        } else if (!isAvailable && slotStart !== -1) {
          slots.push({
            dayOfWeek: dayIndex + 1, // 1=月曜, ..., 6=土曜
            startTime: TIMES[slotStart],
            endTime: TIMES[timeIndex],
          });
          slotStart = -1;
        }
      }
    }

    return slots;
  }, [isCellAvailable]);

  const handleSave = useCallback(() => {
    const slots = convertToSlots();
    onSave(slots);
  }, [convertToSlots, onSave]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>シフト入力 - {month}</CardTitle>
        {!readonly && (
          <p className="text-sm text-muted-foreground">
            緑色のセルは勤務可能時間です。クリックやドラッグでセルを切り替えられます。
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            ref={gridRef}
            className="grid grid-cols-7 gap-1 text-xs"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onTouchMove={handleTouchMove}
          >
            {/* Header row */}
            <div className="p-2 text-center font-medium">時間</div>
            {DAYS.map((day, index) => (
              <div key={index} className="p-2 text-center font-medium">
                {day}
              </div>
            ))}

            {/* Time slots */}
            {TIMES.map((time, timeIndex) => (
              <div key={timeIndex} className="contents">
                <div className="p-2 text-center text-muted-foreground border-r">
                  {time}
                </div>
                {DAYS.map((_, dayIndex) => {
                  const isAvailable = isCellAvailable(dayIndex, timeIndex);
                  return (
                    <div
                      key={dayIndex}
                      data-day-index={dayIndex}
                      data-time-index={timeIndex}
                      className={`
                        aspect-square border cursor-pointer transition-colors
                        ${isAvailable
                          ? "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                        }
                        ${readonly ? "cursor-not-allowed" : ""}
                      `}
                      onMouseDown={() => handleMouseDown(dayIndex, timeIndex)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, timeIndex)}
                      onTouchStart={() => {
                        handleCellInteraction(dayIndex, timeIndex, true);
                        setIsDragging(true);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {!readonly && (
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                シフトを保存
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}