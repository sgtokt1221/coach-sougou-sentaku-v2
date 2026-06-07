"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SESSION_TYPE_LABELS } from '@/lib/types/session';

// ローカル(=日本時間)の年月日を YYYY-MM-DD で返す。
// toISOString() はUTC化で日付が前日にズレるため使わない。
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface SessionCalendarProps {
  weekStart: Date;
  sessions: Array<{
    id: string;
    studentName: string;
    teacherName: string;
    type: string;
    status: string;
    scheduledAt: string;
    duration?: number;
    theme?: string;
    teacherId: string;
  }>;
  onDropStudent: (studentId: string, date: string, time: string) => void;
  onMoveSession?: (sessionId: string, date: string, time: string) => void;
  onRemoveSession?: (sessionId: string) => void;
  /** ブロック下端ドラッグで所要時間(分)を変更したとき */
  onResizeSession?: (sessionId: string, duration: number) => void;
  onClickSession: (sessionId: string) => void;
  /** 空き枠クリックで直接予定を追加する (生徒は呼び出し側のダイアログで選択) */
  onClickEmptySlot?: (date: string, time: string) => void;
}

/**
 * 週間スケジュール表示・編集用のカレンダーコンポーネント
 * ドラッグ&ドロップで新規セッション配置をサポート
 */
export default function SessionCalendar({
  weekStart,
  sessions,
  onDropStudent,
  onMoveSession,
  onRemoveSession,
  onResizeSession,
  onClickSession,
  onClickEmptySlot
}: SessionCalendarProps) {
  const [dragoverCell, setDragoverCell] = useState<string | null>(null);
  // 下端ドラッグによる duration リサイズの状態 (span = 30分単位の行数)
  const [resize, setResize] = useState<{
    id: string;
    startY: number;
    startSpan: number;
    previewSpan: number;
    maxSpan: number;
  } | null>(null);
  // リサイズ中はネイティブの移動ドラッグを抑止するためのフラグ
  const isResizingRef = useRef(false);

  // 今日の日付
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // 現在時刻
  const currentTime = useMemo(() => {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }, []);

  // 曜日名（getDay() に対応: 0=日 .. 6=土）。本日起点でも列の実曜日を表示するため日曜始まり配列。
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  // 週の日付配列を生成
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStart]);

  // 時間帯配列を生成（9:00-23:00、30分刻み）
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push({ hour, minute: 0, display: `${hour}:00` });
      slots.push({ hour, minute: 30, display: `${hour}:30` });
    }
    return slots;
  }, []);

  // セッションの位置情報を計算
  const sessionPositions = useMemo(() => {
    return sessions.map((session) => {
      const scheduledAt = new Date(session.scheduledAt);
      const dayIndex = Math.floor((scheduledAt.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));

      if (dayIndex < 0 || dayIndex >= 7) {
        return null; // この週の範囲外
      }

      const hour = scheduledAt.getHours();
      const minute = scheduledAt.getMinutes();

      if (hour < 9 || hour >= 23) {
        return null; // 表示範囲外
      }

      const gridColumn = dayIndex + 2; // 1列目は時間ラベル
      const gridRow = (hour - 9) * 2 + Math.floor(minute / 30) + 2; // 1行目はヘッダー
      const gridRowEnd = gridRow + Math.max(1, Math.ceil((session.duration ?? 30) / 30));

      return {
        ...session,
        gridColumn,
        gridRow,
        gridRowEnd,
        dayIndex,
        hour,
        minute
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [sessions, weekStart]);

  // リサイズ確定後、サーバー反映で sessions が新 duration になったらプレビューを解除
  // (解除を即時にするとデータ反映までの一瞬で旧高さに戻りちらつくため)
  useEffect(() => {
    if (!resize) return;
    const p = sessionPositions.find((s) => s.id === resize.id);
    if (p && p.gridRowEnd - p.gridRow === resize.previewSpan) setResize(null);
  }, [sessionPositions, resize]);

  // セッションタイプ別の背景色
  const getSessionBgColor = (type: string) => {
    switch (type) {
      case 'coaching':
        return 'bg-sky-100 border-sky-200';
      case 'mock_interview':
        return 'bg-amber-100 border-amber-200';
      case 'essay_review':
        return 'bg-purple-100 border-purple-200';
      case 'group_review':
        return 'bg-emerald-100 border-emerald-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  // ドロップハンドラー（新規配置 or セッション移動）
  const handleDrop = (e: React.DragEvent, dayIndex: number, timeSlot: { hour: number; minute: number }) => {
    e.preventDefault();
    setDragoverCell(null);

    const date = weekDates[dayIndex];
    const timeString = `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}`;

    // セッション移動の場合
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId && onMoveSession) {
      onMoveSession(sessionId, formatLocalDate(date), timeString);
      return;
    }

    // 新規配置の場合
    const studentId = e.dataTransfer.getData('studentId');
    if (!studentId) return;
    onDropStudent(studentId, formatLocalDate(date), timeString);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, timeSlot: { hour: number; minute: number }) => {
    e.preventDefault();
    setDragoverCell(`${dayIndex}-${timeSlot.hour}-${timeSlot.minute}`);
  };

  const handleDragLeave = () => {
    setDragoverCell(null);
  };

  // 現在時刻インジケーターの位置計算
  const getCurrentTimePosition = () => {
    const nowDate = new Date();
    const todayIndex = weekDates.findIndex(date =>
      date.getTime() === today.getTime()
    );

    if (todayIndex === -1 || currentTime.hour < 9 || currentTime.hour >= 23) {
      return null;
    }

    // grid-row は整数ライン番号でないと CSS Grid が解釈できない（小数だと描画されない）。
    // 30分スロットの整数行に置き、分の端数はピクセルのトップオフセットで表現する。
    const gridRow = (currentTime.hour - 9) * 2 + Math.floor(currentTime.minute / 30) + 2;
    const offsetPx = ((currentTime.minute % 30) / 30) * 31; // 行ピッチ31px (セッションカードと整合)
    const gridColumn = todayIndex + 2;

    return { gridRow, gridColumn, offsetPx };
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="w-full overflow-auto">
      <div
        className="grid gap-px bg-gray-200 border border-gray-300 relative"
        style={{
          gridTemplateColumns: '60px repeat(7, 1fr)',
          gridTemplateRows: `40px repeat(${timeSlots.length}, 30px)`
        }}
      >
        {/* ヘッダー行 */}
        <div className="bg-white"></div> {/* 左上の空セル */}
        {weekDates.map((date, index) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <div
              key={index}
              className={`border-r border-gray-300 flex flex-col items-center justify-center gap-0.5 text-sm font-medium ${
                isToday ? 'bg-primary/10' : 'bg-white'
              }`}
            >
              <div className={isToday ? 'text-primary font-bold' : ''}>
                {dayNames[date.getDay()]}
              </div>
              {isToday ? (
                <div className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              ) : (
                <div className="text-xs text-gray-600">
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              )}
            </div>
          );
        })}

        {/* 時間ラベル列とセル */}
        {timeSlots.map((timeSlot, rowIndex) => {
          const isFullHour = timeSlot.minute === 0;
          return (
            <div key={rowIndex} className="contents">
              {/* 時間ラベル */}
              <div className="bg-gray-50 border-r border-gray-300 flex items-center justify-center text-xs font-medium">
                {isFullHour ? timeSlot.display : ''}
              </div>

              {/* 各曜日のセル */}
              {weekDates.map((_, dayIndex) => {
                const cellKey = `${dayIndex}-${timeSlot.hour}-${timeSlot.minute}`;
                const isDragover = dragoverCell === cellKey;

                return (
                  <div
                    key={`${dayIndex}-${rowIndex}`}
                    className={`border-r border-gray-300 relative ${
                      !isFullHour ? 'border-t border-dashed border-gray-200' : 'border-t border-gray-300'
                    } ${isDragover ? 'bg-primary/20 ring-2 ring-inset ring-primary' : 'bg-white hover:bg-gray-50'} transition-colors cursor-crosshair`}
                    onDragOver={(e) => handleDragOver(e, dayIndex, timeSlot)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayIndex, timeSlot)}
                    onClick={() => {
                      if (!onClickEmptySlot) return;
                      const date = weekDates[dayIndex];
                      const timeString = `${timeSlot.hour
                        .toString()
                        .padStart(2, "0")}:${timeSlot.minute
                        .toString()
                        .padStart(2, "0")}`;
                      onClickEmptySlot(formatLocalDate(date), timeString);
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {/* セッションカード（ドラッグ移動対応） */}
        {sessionPositions.map((session) => {
          const baseSpan = session.gridRowEnd - session.gridRow;
          // リサイズ中/確定待ちのブロックはプレビューの span で高さを描く
          const span = resize?.id === session.id ? resize.previewSpan : baseSpan;
          return (
          <div
            key={session.id}
            draggable
            onDragStart={(e) => {
              // リサイズ操作中はネイティブの移動ドラッグを発火させない
              if (isResizingRef.current) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData('sessionId', session.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className={`absolute z-10 overflow-hidden rounded-md border text-xs p-1 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group ${getSessionBgColor(session.type)}`}
            style={{
              gridColumn: session.gridColumn,
              gridRow: session.gridRow,
              height: `${31 * span - 3}px`,
              margin: '1px',
            }}
            onClick={() => onClickSession(session.id)}
          >
            {/* 未配置に戻すボタン */}
            {onRemoveSession && (
              <button
                className="absolute top-0.5 right-0.5 z-20 size-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none hover:bg-rose-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSession(session.id);
                }}
                title="未配置に戻す"
              >
                ×
              </button>
            )}
            <div className="space-y-0.5">
              {session.type === 'group_review' ? (
                <>
                  <div className="font-medium">
                    {session.theme || 'グループ添削'}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {SESSION_TYPE_LABELS[session.type as keyof typeof SESSION_TYPE_LABELS] || session.type}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="font-medium">{session.studentName}</div>
                  <div className="text-gray-600">
                    {session.teacherId ? session.teacherName : (
                      <span className="text-rose-500">講師未設定</span>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {SESSION_TYPE_LABELS[session.type as keyof typeof SESSION_TYPE_LABELS] || session.type}
                  </Badge>
                </>
              )}
            </div>

            {/* 下端リサイズハンドル: ドラッグで所要時間(duration)を伸び縮み */}
            {onResizeSession && (
              <div
                className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity"
                title="ドラッグで時間を変更"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isResizingRef.current = true;
                  (e.target as Element).setPointerCapture(e.pointerId);
                  const startSpan = session.gridRowEnd - session.gridRow;
                  // 表示下端(22:30)を超えないよう最大 span を制限
                  const maxSpan = timeSlots.length + 2 - session.gridRow;
                  setResize({
                    id: session.id,
                    startY: e.clientY,
                    startSpan,
                    previewSpan: startSpan,
                    maxSpan,
                  });
                }}
                onPointerMove={(e) => {
                  if (resize?.id !== session.id) return;
                  const deltaRows = Math.round((e.clientY - resize.startY) / 31);
                  const previewSpan = Math.min(
                    Math.max(1, resize.startSpan + deltaRows),
                    resize.maxSpan
                  );
                  if (previewSpan !== resize.previewSpan) {
                    setResize({ ...resize, previewSpan });
                  }
                }}
                onPointerUp={() => {
                  if (resize?.id !== session.id) return;
                  isResizingRef.current = false;
                  if (resize.previewSpan === resize.startSpan) {
                    setResize(null);
                    return;
                  }
                  // 確定。プレビューはデータ反映まで保持 (上の useEffect で解除)
                  onResizeSession(session.id, resize.previewSpan * 30);
                }}
                onPointerCancel={() => {
                  isResizingRef.current = false;
                  setResize(null);
                }}
              />
            )}
          </div>
          );
        })}

        {/* 現在時刻インジケーター */}
        {currentTimePosition && (
          <div
            className="absolute z-20 border-t-2 border-rose-500"
            style={{
              gridColumn: `${currentTimePosition.gridColumn} / span 1`,
              gridRow: currentTimePosition.gridRow,
              width: '100%',
              height: '2px',
              marginTop: `${currentTimePosition.offsetPx - 1}px`
            }}
          >
            <div className="w-2 h-2 bg-rose-500 rounded-full -mt-1 -ml-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}