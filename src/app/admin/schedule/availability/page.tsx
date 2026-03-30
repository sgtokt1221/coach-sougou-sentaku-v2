"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Save } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { ScheduleGrid } from "@/components/admin/ScheduleGrid";
import type { TeacherAvailability } from "@/lib/types/schedule";

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

export default function AvailabilityPage() {
  const [teachers, setTeachers] = useState<TeacherAvailability[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [editSlots, setEditSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/schedule/availability");
      if (res.ok) {
        const data: TeacherAvailability[] = await res.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // 講師選択時にeditSlotsを初期化
  useEffect(() => {
    const teacher = teachers.find((t) => t.teacherId === selectedTeacherId);
    if (teacher) {
      const slots = new Set<string>();
      for (const s of teacher.slots) {
        slots.add(slotKey(s.dayOfWeek, s.startTime));
      }
      setEditSlots(slots);
    } else {
      setEditSlots(new Set());
    }
  }, [selectedTeacherId, teachers]);

  function handleToggleSlot(day: number, time: string) {
    setEditSlots((prev) => {
      const next = new Set(prev);
      const key = slotKey(day, time);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!selectedTeacherId) return;
    setSaving(true);

    const slots = Array.from(editSlots).map((key) => {
      const [dayStr, time] = key.split("-");
      const dayOfWeek = parseInt(dayStr, 10);
      return {
        dayOfWeek,
        startTime: time,
        endTime: endTimeFor(time),
      };
    });

    try {
      const res = await authFetch("/api/admin/schedule/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacherId, slots }),
      });

      if (res.ok) {
        // ローカルのteachersも更新
        setTeachers((prev) =>
          prev.map((t) =>
            t.teacherId === selectedTeacherId ? { ...t, slots } : t
          )
        );
        alert("空きコマを保存しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-xl font-bold text-foreground">空きコマ設定</h1>
          <p className="text-sm text-muted-foreground">
            講師の空きコマをグリッド上でクリックして設定します
          </p>
        </div>
      </div>

      {/* Teacher Selector */}
      <div className="max-w-md">
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

      {selectedTeacherId && (
        <>
          <ScheduleGrid
            mode="edit-availability"
            editSlots={editSlots}
            onToggleSlot={handleToggleSlot}
          />

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "保存中..." : "空きコマを保存"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
