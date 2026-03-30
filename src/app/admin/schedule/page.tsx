"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Trash2, Plus } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { ScheduleGrid } from "@/components/admin/ScheduleGrid";
import type {
  TeacherAvailability,
  StudentPreference,
  Assignment,
} from "@/lib/types/schedule";

export default function SchedulePage() {
  const [teachers, setTeachers] = useState<TeacherAvailability[]>([]);
  const [students, setStudents] = useState<StudentPreference[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [availRes, prefRes, assignRes] = await Promise.all([
        authFetch("/api/admin/schedule/availability"),
        authFetch("/api/admin/schedule/preferences"),
        authFetch("/api/admin/schedule/assignments"),
      ]);

      if (availRes.ok) setTeachers(await availRes.json());
      if (prefRes.ok) setStudents(await prefRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
    } catch (error) {
      console.error("Failed to fetch schedule data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTeacher = teachers.find(
    (t) => t.teacherId === selectedTeacherId
  );
  const selectedStudent = students.find(
    (s) => s.studentId === selectedStudentId
  );

  // フィルタ: 選択中の講師/生徒に関連するアサインのみ
  const filteredAssignments = assignments.filter((a) => {
    if (selectedTeacherId && a.teacherId !== selectedTeacherId) return false;
    if (selectedStudentId && a.studentId !== selectedStudentId) return false;
    return true;
  });

  async function handleCellClick(
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) {
    if (!selectedTeacherId || !selectedStudentId) {
      alert("講師と生徒の両方を選択してください");
      return;
    }

    // 既にアサイン済みかチェック
    const existing = filteredAssignments.find(
      (a) => a.dayOfWeek === dayOfWeek && a.startTime === startTime
    );
    if (existing) {
      alert("このコマは既にアサイン済みです");
      return;
    }

    const teacher = teachers.find((t) => t.teacherId === selectedTeacherId);
    const student = students.find((s) => s.studentId === selectedStudentId);
    if (!teacher || !student) return;

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const confirmMsg = `${dayNames[dayOfWeek]}曜 ${startTime}-${endTime}\n講師: ${teacher.teacherName}\n生徒: ${student.studentName}\n\nアサインしますか？`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await authFetch("/api/admin/schedule/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          teacherName: teacher.teacherName,
          studentId: selectedStudentId,
          studentName: student.studentName,
          dayOfWeek,
          startTime,
          endTime,
        }),
      });

      if (res.ok) {
        const newAssignment = await res.json();
        setAssignments((prev) => [newAssignment, ...prev]);
      } else {
        const data = await res.json();
        alert(data.error ?? "アサインに失敗しました");
      }
    } catch {
      alert("アサインに失敗しました");
    }
  }

  async function handleDeleteAssignment(id: string) {
    if (!confirm("このアサインを削除しますか？")) return;

    try {
      const res = await authFetch(
        `/api/admin/schedule/assignments?id=${id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    }
  }

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">スケジュール管理</h1>
          <p className="text-sm text-muted-foreground">
            講師と生徒のスケジュールを管理・アサインします
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            講師を選択
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">-- 講師を選択 --</option>
            {teachers.map((t) => (
              <option key={t.teacherId} value={t.teacherId}>
                {t.teacherName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            生徒を選択（Proプランのみ）
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">-- 生徒を選択 --</option>
            {students.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.studentName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Grid */}
      <ScheduleGrid
        teacherSlots={selectedTeacher?.slots}
        studentSlots={selectedStudent?.slots}
        assignments={filteredAssignments}
        selectedTeacherId={selectedTeacherId}
        selectedStudentId={selectedStudentId}
        onCellClick={handleCellClick}
      />

      {/* Assignments Table */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            アサイン済み一覧
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {filteredAssignments.length}
          </span>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            アサインがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    曜日
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    時間
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    講師
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    生徒
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/10"
                  >
                    <td className="px-4 py-2">{dayNames[a.dayOfWeek]}</td>
                    <td className="px-4 py-2">
                      {a.startTime} - {a.endTime}
                    </td>
                    <td className="px-4 py-2">{a.teacherName}</td>
                    <td className="px-4 py-2">{a.studentName}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
