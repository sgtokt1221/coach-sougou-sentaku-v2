"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import SessionCalendar from "@/components/admin/SessionCalendar";
import UnplacedStudentsSidebar from "@/components/admin/UnplacedStudentsSidebar";
import type { Session } from "@/lib/types/session";

// Monday取得ヘルパー
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
}

interface Teacher {
  uid: string;
  displayName: string;
  studentCount: number;
}

interface AvailableSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function AdminSessionsPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [pickerSession, setPickerSession] = useState<Session | null>(null);

  // 週の範囲を計算
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [weekStart]);

  // 現在月を計算（未配置生徒取得用）
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  // データ取得
  const { data: allSessions = [], mutate: mutateSessions } = useAuthSWR<Session[]>('/api/sessions');
  const { data: unplacedData } = useAuthSWR<{ students: UnplacedStudent[] } | UnplacedStudent[]>(
    `/api/admin/sessions/unplaced?month=${currentMonth}`
  );
  const unplacedStudents: UnplacedStudent[] = Array.isArray(unplacedData)
    ? unplacedData
    : unplacedData?.students ?? [];
  const { data: teachers = [] } = useAuthSWR<Teacher[]>('/api/admin/teachers/all');
  const { data: availabilityData = {} } = useAuthSWR('/api/admin/schedule/availability');

  // 週範囲内のセッションをフィルタリング
  const weekSessions = useMemo(() => {
    return allSessions.filter(session => {
      const scheduledAt = new Date(session.scheduledAt);
      return scheduledAt >= weekStart && scheduledAt <= weekEnd;
    });
  }, [allSessions, weekStart, weekEnd]);

  // 利用可能性データをMapに変換
  const availabilities = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    if (availabilityData && typeof availabilityData === 'object') {
      Object.entries(availabilityData as Record<string, AvailableSlot[]>).forEach(([teacherId, slots]) => {
        map.set(teacherId, slots);
      });
    }
    return map;
  }, [availabilityData]);

  // 週ナビゲーション
  const goToPreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  // 週表示フォーマット
  const formatWeekRange = (): string => {
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);

    const startStr = `${weekStart.getFullYear()}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}/${weekStart.getDate().toString().padStart(2, '0')}`;
    const endStr = `${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

    return `${startStr} - ${endStr}`;
  };

  // ドロップハンドラー
  const handleDropStudent = async (studentId: string, date: string, time: string) => {
    try {
      const studentData = unplacedStudents.find(s => s.uid === studentId);
      if (!studentData) return;

      const response = await authFetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'coaching',
          studentId,
          studentName: studentData.displayName,
          teacherId: '',
          teacherName: '',
          scheduledAt: `${date}T${time}:00`,
        }),
      });

      if (!response.ok) {
        throw new Error('セッションの作成に失敗しました');
      }

      const newSession = await response.json();

      // SWRデータを更新
      await mutateSessions();

      // 作成されたセッションの講師選択ポップオーバーを表示
      setPickerSession(newSession);

    } catch (error) {
      console.error('セッション作成エラー:', error);
      // TODO: トースト通知でエラーを表示
    }
  };

  // セッションクリックハンドラー
  const handleClickSession = (sessionId: string) => {
    window.location.href = `/admin/sessions/${sessionId}`;
  };

  // 講師未設定セッションクリック
  const handleClickUnassignedSession = (session: Session) => {
    setPickerSession(session);
  };

  // 講師選択ハンドラー
  const handleTeacherSelect = async (teacherId: string, teacherName: string) => {
    if (!pickerSession) return;

    try {
      const response = await authFetch(`/api/sessions/${pickerSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          teacherName,
        }),
      });

      if (!response.ok) {
        throw new Error('講師の割り当てに失敗しました');
      }

      // SWRデータを更新
      await mutateSessions();
      setPickerSession(null);

    } catch (error) {
      console.error('講師割り当てエラー:', error);
      // TODO: トースト通知でエラーを表示
    }
  };

  // セッションクリックハンドラーを統合
  const handleSessionClick = (sessionId: string) => {
    const session = weekSessions.find(s => s.id === sessionId);
    if (session && !session.teacherId) {
      handleClickUnassignedSession(session);
    } else {
      handleClickSession(sessionId);
    }
  };

  // ポップオーバー用の曜日・時間計算
  const getSessionDayAndTime = (session: Session) => {
    const scheduledAt = new Date(session.scheduledAt);
    const dayOfWeek = scheduledAt.getDay(); // 0=Sun, 1=Mon, ...
    const time = `${scheduledAt.getHours().toString().padStart(2, '0')}:${scheduledAt.getMinutes().toString().padStart(2, '0')}`;
    return { dayOfWeek, time };
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-4">
        {/* 週ナビゲーションヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">セッション管理</h1>
            <p className="text-sm text-muted-foreground">
              週間スケジュール - ドラッグ&ドロップでセッションを配置
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              今週
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="size-4" />
            </Button>
            <div className="ml-4 text-sm font-medium">
              {formatWeekRange()}
            </div>
          </div>
        </div>

        {/* セッションカレンダー */}
        <SessionCalendar
          weekStart={weekStart}
          sessions={weekSessions}
          onDropStudent={handleDropStudent}
          onClickSession={handleSessionClick}
        />
      </div>

      {/* 未配置生徒サイドバー */}
      <div className="w-64 border-l bg-gray-50/50">
        <UnplacedStudentsSidebar
          students={unplacedStudents}
          loading={!unplacedStudents}
        />
      </div>

      {/* 講師選択ポップオーバー */}
      {pickerSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setPickerSession(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">講師を選択</h3>
                <p className="text-sm text-muted-foreground">
                  {pickerSession.studentName}のセッション講師を選択してください
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {teachers
                  .filter(teacher => {
                    const { dayOfWeek, time } = getSessionDayAndTime(pickerSession);
                    const slots = availabilities.get(teacher.uid) || [];
                    const targetMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

                    return slots.some(slot => {
                      if (slot.dayOfWeek !== dayOfWeek) return false;
                      const startMinutes = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
                      const endMinutes = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
                      return targetMinutes >= startMinutes && targetMinutes < endMinutes;
                    });
                  })
                  .map((teacher) => (
                    <div
                      key={teacher.uid}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors border"
                      onClick={() => handleTeacherSelect(teacher.uid, teacher.displayName)}
                    >
                      <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="font-medium">{teacher.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          担当: {teacher.studentCount}名
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPickerSession(null)} className="flex-1">
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}