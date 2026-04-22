"use client";

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SESSION_TYPE_LABELS } from '@/lib/types/session';

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
  onClickSession: (sessionId: string) => void;
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
  onClickSession
}: SessionCalendarProps) {
  const [dragoverCell, setDragoverCell] = useState<string | null>(null);

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

  // 曜日名
  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

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
      onMoveSession(sessionId, date.toISOString().split('T')[0], timeString);
      return;
    }

    // 新規配置の場合
    const studentId = e.dataTransfer.getData('studentId');
    if (!studentId) return;
    onDropStudent(studentId, date.toISOString().split('T')[0], timeString);
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

    const gridRow = (currentTime.hour - 9) * 2 + currentTime.minute / 30 + 2;
    const gridColumn = todayIndex + 2;

    return { gridRow, gridColumn };
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
              className={`bg-white border-r border-gray-300 flex flex-col items-center justify-center text-sm font-medium ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              <div>{dayNames[index]}</div>
              <div className="text-xs text-gray-600">
                {date.getMonth() + 1}/{date.getDate()}
              </div>
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
                    className={`bg-white border-r border-gray-300 relative ${
                      !isFullHour ? 'border-t border-dashed border-gray-200' : 'border-t border-gray-300'
                    } ${isDragover ? 'bg-primary/10' : ''} hover:bg-gray-50 transition-colors cursor-crosshair`}
                    onDragOver={(e) => handleDragOver(e, dayIndex, timeSlot)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayIndex, timeSlot)}
                  />
                );
              })}
            </div>
          );
        })}

        {/* セッションカード（ドラッグ移動対応） */}
        {sessionPositions.map((session) => (
          <div
            key={session.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('sessionId', session.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className={`absolute z-10 rounded-md border text-xs p-1.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group ${getSessionBgColor(session.type)}`}
            style={{
              gridColumn: session.gridColumn,
              gridRow: `${session.gridRow} / ${session.gridRowEnd}`,
              margin: '1px'
            }}
            onClick={() => onClickSession(session.id)}
          >
            {/* 未配置に戻すボタン */}
            {onRemoveSession && (
              <button
                className="absolute -top-1.5 -right-1.5 z-20 size-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none hover:bg-rose-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSession(session.id);
                }}
                title="未配置に戻す"
              >
                ×
              </button>
            )}
            <div className="space-y-1">
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
          </div>
        ))}

        {/* 現在時刻インジケーター */}
        {currentTimePosition && (
          <div
            className="absolute z-20 border-t-2 border-rose-500"
            style={{
              gridColumn: `${currentTimePosition.gridColumn} / span 1`,
              gridRow: currentTimePosition.gridRow,
              width: '100%',
              height: '2px',
              marginTop: '-1px'
            }}
          >
            <div className="w-2 h-2 bg-rose-500 rounded-full -mt-1 -ml-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}