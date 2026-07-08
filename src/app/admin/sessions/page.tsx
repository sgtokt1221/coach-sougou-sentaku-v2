"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import SessionCalendar from "@/components/admin/SessionCalendar";
import UnplacedStudentsSidebar from "@/components/admin/UnplacedStudentsSidebar";
import AdminSessionList from "@/components/admin/AdminSessionList";
import RecurringMasterPanel from "@/components/admin/RecurringMasterPanel";
import { SESSION_TYPE_LABELS, SESSION_TYPE_CREATE_OPTIONS } from "@/lib/types/session";
import type { Session, SessionType } from "@/lib/types/session";
import type { StudentListItem } from "@/lib/types/admin";

// 指定日のローカル(=日本時間)0時を返すヘルパー。カレンダーは本日起点で表示する。
function startOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
  grade?: number | null;
  gradeUpdatedAt?: string | null;
  isRonin?: boolean;
  school?: string | null;
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
  const [activeTab, setActiveTab] = useState<"schedule" | "list" | "master">("schedule");
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));
  const [pickerSession, setPickerSession] = useState<Session | null>(null);
  // セッション作成モーダル（空き枠クリック＝生徒選択式 / D&Dドロップ＝生徒固定）。
  // fixedStudent があれば D&D 由来で生徒は固定表示、無ければ select で選ぶ。
  const [addDialog, setAddDialog] = useState<{
    date: string;
    time: string;
    fixedStudent?: { uid: string; name: string };
  } | null>(null);
  const [formStudentId, setFormStudentId] = useState("");
  const [formType, setFormType] = useState<SessionType>("general");
  const [formIsResearch, setFormIsResearch] = useState(false);

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
  const { data: allSessions = [], mutate: mutateSessions, error: sessionsError } = useAuthSWR<Session[]>('/api/sessions');
  // 直接予定追加の生徒選択肢: コーチプランの担当生徒全員
  const { data: allStudentsData = [] } = useAuthSWR<StudentListItem[]>('/api/admin/students');
  const coachStudents = allStudentsData.filter((s) => s.plan === "coach");
  const { data: unplacedData, error: unplacedError, mutate: mutateUnplaced } = useAuthSWR<{ students: UnplacedStudent[] } | UnplacedStudent[]>(
    `/api/admin/sessions/unplaced?month=${currentMonth}`
  );
  const unplacedStudents: UnplacedStudent[] = Array.isArray(unplacedData)
    ? unplacedData
    : unplacedData?.students ?? [];
  const { data: teachers = [], error: teachersError } = useAuthSWR<Teacher[]>('/api/admin/teachers/all');
  const { data: availabilityData = {}, error: availabilityError } = useAuthSWR('/api/admin/schedule/availability');

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
    setWeekStart(startOfDay(new Date()));
  };

  // 週表示フォーマット
  const formatWeekRange = (): string => {
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);

    const startStr = `${weekStart.getFullYear()}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}/${weekStart.getDate().toString().padStart(2, '0')}`;
    const endStr = `${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

    return `${startStr} - ${endStr}`;
  };

  // セッション作成の共通処理（D&Dドロップ／空き枠からの直接追加 共通）。
  // 生徒の指定方法が違うだけで、作成内容・後続の講師選択ポップオーバーは同一。
  const createSessionAt = async (
    studentId: string,
    studentName: string,
    date: string,
    time: string,
    type: SessionType,
    isResearch: boolean,
  ) => {
    try {
      const response = await authFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          isResearch,
          studentId,
          studentName,
          teacherId: '',
          teacherName: '',
          scheduledAt: `${date}T${time}:00`,
        }),
      });
      if (!response.ok) {
        throw new Error('セッションの作成に失敗しました');
      }
      const newSession = await response.json();
      // SWRデータを更新（未配置一覧も再取得して配置済みカードを消す）
      await Promise.all([mutateSessions(), mutateUnplaced()]);
      // 作成されたセッションの講師選択ポップオーバーを表示
      setPickerSession(newSession);
    } catch (error) {
      console.error('セッション作成エラー:', error);
      // TODO: トースト通知でエラーを表示
    }
  };

  // ドロップハンドラー（未配置カードを枠にドロップ）。即作成せず、生徒固定で作成モーダルを開く。
  const handleDropStudent = (studentId: string, date: string, time: string) => {
    const studentData = unplacedStudents.find(s => s.uid === studentId);
    if (!studentData) return;
    setAddDialog({ date, time, fixedStudent: { uid: studentId, name: studentData.displayName } });
    setFormType("general");
    setFormIsResearch(false);
  };

  // セッション移動ハンドラー（D&Dで別の時間帯に移動）
  const handleMoveSession = async (sessionId: string, date: string, time: string) => {
    try {
      const response = await authFetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: `${date}T${time}:00` }),
      });
      if (!response.ok) throw new Error();
      await mutateSessions();
    } catch {
      console.error('セッション移動エラー');
    }
  };

  // セッション所要時間リサイズ（ブロック下端ドラッグで duration を変更）
  const handleResizeSession = async (sessionId: string, duration: number) => {
    const safe = Math.min(Math.max(duration, 30), 600); // 念のためクランプ (30分〜10時間)
    try {
      const response = await authFetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: safe }),
      });
      if (!response.ok) throw new Error();
      await mutateSessions();
    } catch {
      console.error('セッション時間変更エラー');
    }
  };

  // セッション削除（未配置に戻す）
  const handleRemoveSession = async (sessionId: string) => {
    if (!confirm('このセッションを未配置に戻しますか？')) return;
    try {
      const response = await authFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await Promise.all([mutateSessions(), mutateUnplaced()]);
    } catch {
      console.error('セッション削除エラー');
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
        {(sessionsError || unplacedError || teachersError || availabilityError) && (
          <div className="mb-4 space-y-2">
            {sessionsError && <ApiErrorBanner error={sessionsError} title="セッション一覧の取得に失敗しました" />}
            {unplacedError && <ApiErrorBanner error={unplacedError} title="未配置生徒の取得に失敗しました" />}
            {teachersError && <ApiErrorBanner error={teachersError} title="講師一覧の取得に失敗しました" />}
            {availabilityError && <ApiErrorBanner error={availabilityError} title="シフト情報の取得に失敗しました" />}
          </div>
        )}
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">セッション管理</h1>
            <div className="flex rounded-lg border p-1 mt-2 w-fit">
              <button
                onClick={() => setActiveTab("schedule")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "schedule" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                スケジュール
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                一覧
              </button>
              <button
                onClick={() => setActiveTab("master")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "master" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                マスタ
              </button>
            </div>
          </div>

          {activeTab === "schedule" && (
            <div className="hidden items-center gap-2 lg:flex">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                今日
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <div className="ml-4 text-sm font-medium">
                {formatWeekRange()}
              </div>
            </div>
          )}
        </div>

        {activeTab === "schedule" ? (
          <>
            {/* カレンダー(D&D)はPC専用。モバイルは一覧で代替 */}
            <div className="hidden lg:block">
              <SessionCalendar
                weekStart={weekStart}
                sessions={weekSessions}
                onDropStudent={handleDropStudent}
                onMoveSession={handleMoveSession}
                onRemoveSession={handleRemoveSession}
                onResizeSession={handleResizeSession}
                onClickSession={handleSessionClick}
                onClickEmptySlot={(date, time) => {
                  setAddDialog({ date, time });
                  setFormStudentId("");
                  setFormType("general");
                  setFormIsResearch(false);
                }}
              />
            </div>
            <div className="lg:hidden">
              <p className="mb-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                カレンダー編集はPCでご利用ください。スマホでは一覧を表示します。
              </p>
              <AdminSessionList sessions={allSessions} />
            </div>
          </>
        ) : activeTab === "master" ? (
          <RecurringMasterPanel coachStudents={coachStudents} />
        ) : (
          <AdminSessionList sessions={allSessions} />
        )}
      </div>

      {/* 未配置生徒サイドバー（スケジュールタブのみ） */}
      {activeTab === "schedule" && (
        <div className="hidden w-64 border-l bg-gray-50/50 lg:block">
          <UnplacedStudentsSidebar
            students={unplacedStudents}
            loading={!unplacedStudents}
          />
        </div>
      )}

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
                {teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">講師が登録されていません</p>
                ) : teachers
                  .map((teacher) => {
                    const { dayOfWeek, time } = getSessionDayAndTime(pickerSession);
                    const slots = availabilities.get(teacher.uid) || [];
                    const targetMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                    const isAvailable = slots.some(slot => {
                      if (slot.dayOfWeek !== dayOfWeek) return false;
                      const startMinutes = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
                      const endMinutes = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
                      return targetMinutes >= startMinutes && targetMinutes < endMinutes;
                    });
                    return { teacher, isAvailable };
                  })
                  .sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1))
                  .map(({ teacher, isAvailable }) => (
                    <div
                      key={teacher.uid}
                      className={`flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors border ${!isAvailable ? "opacity-60" : ""}`}
                      onClick={() => handleTeacherSelect(teacher.uid, teacher.displayName)}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isAvailable ? "bg-emerald-500" : "bg-gray-300"}`}></div>
                      <div className="flex-1">
                        <div className="font-medium">{teacher.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          担当: {teacher.studentCount}名
                          {!isAvailable && " · この時間帯は未登録"}
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

      {/* セッション作成モーダル（空き枠クリック＝生徒選択 / D&Dドロップ＝生徒固定）。講師は作成後に選択 */}
      {addDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setAddDialog(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">予定を追加</h3>
                <p className="text-sm text-muted-foreground">
                  {addDialog.date} {addDialog.time} に予定を作成します（講師は作成後に選択）。
                </p>
              </div>

              {/* 生徒: D&D由来は固定表示、クリック由来は選択 */}
              {addDialog.fixedStudent ? (
                <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  生徒: <span className="font-medium">{addDialog.fixedStudent.name}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">生徒</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                  >
                    <option value="">-- 生徒を選択 --</option>
                    {coachStudents.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 種別（group_review はカレンダーからは作成しない） */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">種別</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as SessionType)}
                >
                  {SESSION_TYPE_CREATE_OPTIONS.filter((t) => t !== "group_review").map(
                    (t) => (
                      <option key={t} value={t}>
                        {SESSION_TYPE_LABELS[t]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* 探究授業フラグ */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={formIsResearch}
                  onChange={(e) => setFormIsResearch(e.target.checked)}
                />
                探究授業セッション（生徒が講師に教える回）
              </label>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAddDialog(null)} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  className="flex-1"
                  disabled={!addDialog.fixedStudent && !formStudentId}
                  onClick={() => {
                    const dialog = addDialog;
                    const studentId = dialog.fixedStudent?.uid ?? formStudentId;
                    const studentName =
                      dialog.fixedStudent?.name ??
                      coachStudents.find((x) => x.uid === formStudentId)?.displayName;
                    if (!studentId || !studentName) return;
                    setAddDialog(null);
                    void createSessionAt(studentId, studentName, dialog.date, dialog.time, formType, formIsResearch);
                  }}
                >
                  追加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}