"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SESSION_TYPE_LABELS } from "@/lib/types/session";
import type { SessionMaster } from "@/lib/types/teacher-shift";

interface SessionMasterCalendarProps {
  masters: SessionMaster[];
  /** 既存マスターを別セルへ移動 */
  onMoveMaster: (id: string, preferredDay: number, time: string) => void;
  /** 未配置の生徒カードをセルへドロップ＝マスター新規作成 */
  onCreateMaster: (
    studentId: string,
    studentName: string,
    frequency: number,
    preferredDay: number,
    time: string,
  ) => void;
  /** マスター削除（生徒を未配置へ戻す） */
  onDeleteMaster: (id: string) => void;
  /** カードクリックで編集 */
  onEditMaster: (master: SessionMaster) => void;
}

// 列index(0=月..6=日) ↔ preferredDay(0=日..6=土)
const colToPreferredDay = (col: number) => (col + 1) % 7;
const preferredDayToCol = (day: number) => (day + 6) % 7;

/**
 * セッションマスターの週テンプレート（曜日×時間）カレンダー。
 * SessionCalendar と同じ独自 HTML5 D&D。実日付ではなく曜日テンプレートを編集する。
 */
export default function SessionMasterCalendar({
  masters,
  onMoveMaster,
  onCreateMaster,
  onDeleteMaster,
  onEditMaster,
}: SessionMasterCalendarProps) {
  const [dragoverCell, setDragoverCell] = useState<string | null>(null);

  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];

  // 時間帯（9:00-22:30、30分刻み）— SessionCalendar と同一
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; display: string }[] = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push({ hour, minute: 0, display: `${hour}:00` });
      slots.push({ hour, minute: 30, display: `${hour}:30` });
    }
    return slots;
  }, []);

  // 配置済みマスター（preferredDay 指定あり）の位置計算
  const placed = useMemo(() => {
    return masters
      .map((m) => {
        if (m.preferredDay === undefined || m.preferredDay === null) return null;
        const time = m.preferredTime || "14:00";
        const [hourStr, minuteStr] = time.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10) || 0;
        if (Number.isNaN(hour) || hour < 9 || hour >= 23) return null;
        const gridColumn = preferredDayToCol(m.preferredDay) + 2; // 1列目は時間ラベル
        const gridRow = (hour - 9) * 2 + Math.floor(minute / 30) + 2; // 1行目はヘッダー
        const gridRowEnd = gridRow + Math.max(1, Math.ceil((m.duration ?? 60) / 30));
        return { master: m, gridColumn, gridRow, gridRowEnd };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [masters]);

  const getBgColor = (type: string) => {
    switch (type) {
      case "coaching":
        return "bg-sky-100 border-sky-200";
      case "mock_interview":
        return "bg-amber-100 border-amber-200";
      case "essay_review":
        return "bg-purple-100 border-purple-200";
      default:
        return "bg-gray-100 border-gray-200";
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    col: number,
    timeSlot: { hour: number; minute: number },
  ) => {
    e.preventDefault();
    setDragoverCell(null);
    const time = `${timeSlot.hour.toString().padStart(2, "0")}:${timeSlot.minute
      .toString()
      .padStart(2, "0")}`;
    const preferredDay = colToPreferredDay(col);

    // 既存マスターの移動
    const masterId = e.dataTransfer.getData("masterId");
    if (masterId) {
      onMoveMaster(masterId, preferredDay, time);
      return;
    }

    // 未配置の生徒カード → マスター新規作成
    const studentId = e.dataTransfer.getData("studentId");
    if (!studentId) return;
    const studentName = e.dataTransfer.getData("studentName");
    const frequency = parseInt(e.dataTransfer.getData("frequency"), 10) || 1;
    onCreateMaster(studentId, studentName, frequency, preferredDay, time);
  };

  const handleDragOver = (
    e: React.DragEvent,
    col: number,
    timeSlot: { hour: number; minute: number },
  ) => {
    e.preventDefault();
    setDragoverCell(`${col}-${timeSlot.hour}-${timeSlot.minute}`);
  };

  return (
    <div className="w-full overflow-auto">
      <div
        className="grid gap-px bg-gray-200 border border-gray-300 relative"
        style={{
          gridTemplateColumns: "60px repeat(7, 1fr)",
          gridTemplateRows: `40px repeat(${timeSlots.length}, 30px)`,
        }}
      >
        {/* ヘッダー行 */}
        <div className="bg-white"></div>
        {dayNames.map((name, index) => (
          <div
            key={index}
            className="bg-white border-r border-gray-300 flex items-center justify-center text-sm font-medium"
          >
            {name}
          </div>
        ))}

        {/* 時間ラベル列とセル */}
        {timeSlots.map((timeSlot, rowIndex) => {
          const isFullHour = timeSlot.minute === 0;
          return (
            <div key={rowIndex} className="contents">
              <div className="bg-gray-50 border-r border-gray-300 flex items-center justify-center text-xs font-medium">
                {isFullHour ? timeSlot.display : ""}
              </div>
              {dayNames.map((_, col) => {
                const cellKey = `${col}-${timeSlot.hour}-${timeSlot.minute}`;
                const isDragover = dragoverCell === cellKey;
                return (
                  <div
                    key={`${col}-${rowIndex}`}
                    className={`border-r border-gray-300 relative ${
                      !isFullHour
                        ? "border-t border-dashed border-gray-200"
                        : "border-t border-gray-300"
                    } ${
                      isDragover
                        ? "bg-primary/20 ring-2 ring-inset ring-primary"
                        : "bg-white hover:bg-gray-50"
                    } transition-colors cursor-crosshair`}
                    onDragOver={(e) => handleDragOver(e, col, timeSlot)}
                    onDragLeave={() => setDragoverCell(null)}
                    onDrop={(e) => handleDrop(e, col, timeSlot)}
                  />
                );
              })}
            </div>
          );
        })}

        {/* 配置済みマスターカード（ドラッグ移動対応） */}
        {placed.map(({ master, gridColumn, gridRow, gridRowEnd }) => (
          <div
            key={master.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("masterId", master.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className={`absolute inset-px z-10 overflow-hidden rounded-md border text-xs p-1 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group ${getBgColor(master.type)}`}
            style={{
              gridColumn,
              gridRow: `${gridRow} / ${gridRowEnd}`,
            }}
            onClick={() => onEditMaster(master)}
          >
            {/* 未配置に戻す（マスター削除） */}
            <button
              className="absolute top-0.5 right-0.5 z-20 size-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none hover:bg-rose-600"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMaster(master.id);
              }}
              title="未配置に戻す"
            >
              ×
            </button>
            <div className="space-y-0.5">
              <div className="font-medium truncate">{master.studentName}</div>
              <div className="text-gray-600 truncate">
                {master.teacherName ? (
                  master.teacherName
                ) : (
                  <span className="text-rose-500">講師未割当</span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {SESSION_TYPE_LABELS[master.type as keyof typeof SESSION_TYPE_LABELS] ||
                  master.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
