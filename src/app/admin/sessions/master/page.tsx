"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CalendarPlus, GripVertical, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import SessionMasterCalendar from "@/components/admin/SessionMasterCalendar";
import UnplacedFilterBar, {
  applyUnplacedFilters,
  EMPTY_FILTER,
  type UnplacedFilterValue,
} from "@/components/admin/UnplacedFilterBar";
import type { SessionMaster } from "@/lib/types/teacher-shift";

export default function SessionMasterPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [masters, setMasters] = useState<SessionMaster[]>([]);
  const [unplacedStudents, setUnplacedStudents] = useState<
    {
      uid: string;
      displayName: string;
      sessionsPerMonth: number;
      targetUniversities: string[];
      grade?: number | null;
      gradeUpdatedAt?: string | null;
      isRonin?: boolean;
      school?: string | null;
    }[]
  >([]);
  const [unplacedFilter, setUnplacedFilter] = useState<UnplacedFilterValue>(EMPTY_FILTER);
  const [teachers, setTeachers] = useState<{ uid: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<SessionMaster | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    frequency: 1,
    preferredDay: undefined as number | undefined,
    preferredTime: "14:00",
    teacherId: "",
    teacherName: "",
    type: "coaching" as "coaching" | "mock_interview" | "essay_review" | "general",
    duration: 60,
    format: "offline" as "online" | "offline",
    notes: "",
  });

  useEffect(() => {
    loadMasters();
    loadUnplaced();
  }, [currentMonth]);

  useEffect(() => {
    authFetch("/api/admin/teachers/all")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setTeachers(
          (Array.isArray(data) ? data : []).map((t: { uid: string; displayName: string }) => ({
            uid: t.uid,
            displayName: t.displayName,
          })),
        ),
      )
      .catch(() => setTeachers([]));
  }, []);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/admin/sessions/master?month=${currentMonth}`);
      if (response.ok) {
        const data = await response.json();
        setMasters(data);
      } else {
        console.error("マスター取得失敗");
      }
    } catch (error) {
      console.error("マスター取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnplaced = async () => {
    try {
      const response = await authFetch(
        `/api/admin/sessions/master-unplaced?month=${currentMonth}`,
      );
      if (response.ok) {
        const data = await response.json();
        setUnplacedStudents(data.students ?? []);
      }
    } catch (error) {
      console.error("未配置生徒取得エラー:", error);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        month: currentMonth,
        ...(editingMaster && { id: editingMaster.id }),
      };

      const response = await authFetch("/api/admin/sessions/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await reload();
        setIsDialogOpen(false);
        resetForm();
      } else {
        console.error("保存失敗");
      }
    } catch (error) {
      console.error("保存エラー:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const response = await authFetch(`/api/admin/sessions/master?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await reload();
      } else {
        console.error("削除失敗");
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  const handleEdit = (master: SessionMaster) => {
    setEditingMaster(master);
    setFormData({
      studentId: master.studentId,
      studentName: master.studentName,
      frequency: master.frequency,
      preferredDay: master.preferredDay,
      preferredTime: master.preferredTime || "14:00",
      teacherId: master.teacherId || "",
      teacherName: master.teacherName || "",
      type: master.type,
      duration: master.duration || 60,
      format: master.format || "offline",
      notes: master.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMaster(null);
    setFormData({
      studentId: "",
      studentName: "",
      frequency: 1,
      preferredDay: undefined,
      preferredTime: "14:00",
      teacherId: "",
      teacherName: "",
      type: "coaching",
      duration: 60,
      format: "offline",
      notes: "",
    });
  };

  const handleCopyFromPreviousMonth = async () => {
    if (!confirm("前月のマスターをコピーしますか？")) return;

    const prevDate = new Date(currentMonth + "-01");
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    try {
      const response = await authFetch("/api/admin/sessions/master/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMonth: prevMonth,
          targetMonth: currentMonth,
          action: "copy",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.count}件のマスターをコピーしました`);
        await loadMasters();
      } else {
        const error = await response.json();
        alert(error.error || "コピーに失敗しました");
      }
    } catch (error) {
      console.error("コピーエラー:", error);
      alert("コピーエラーが発生しました");
    }
  };

  const handleGenerateSessions = async () => {
    if (!confirm("マスターからスケジュールを生成しますか？")) return;

    try {
      const response = await authFetch("/api/admin/sessions/master/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMonth: currentMonth,
          targetMonth: currentMonth,
          action: "generate",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.count}件のセッションを生成しました`);
      } else {
        const error = await response.json();
        alert(error.error || "生成に失敗しました");
      }
    } catch (error) {
      console.error("生成エラー:", error);
      alert("生成エラーが発生しました");
    }
  };

  const reload = async () => {
    await Promise.all([loadMasters(), loadUnplaced()]);
  };

  // 未配置の生徒カードをセルへドロップ＝マスター新規作成
  const handleCreateMaster = async (
    studentId: string,
    studentName: string,
    frequency: number,
    preferredDay: number,
    time: string,
  ) => {
    try {
      const response = await authFetch("/api/admin/sessions/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          studentId,
          studentName,
          frequency,
          preferredDay,
          preferredTime: time,
          type: "coaching",
          duration: 60,
          format: "offline",
        }),
      });
      if (response.ok) await reload();
      else console.error("マスター作成に失敗しました");
    } catch (error) {
      console.error("マスター作成エラー:", error);
    }
  };

  // 既存マスターを別セルへ移動
  const handleMoveMaster = async (id: string, preferredDay: number, time: string) => {
    try {
      const response = await authFetch("/api/admin/sessions/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, preferredDay, preferredTime: time }),
      });
      if (response.ok) await loadMasters();
      else console.error("マスター移動に失敗しました");
    } catch (error) {
      console.error("マスター移動エラー:", error);
    }
  };

  // マスター削除（生徒を未配置へ戻す）
  const handleDeleteMaster = async (id: string) => {
    try {
      const response = await authFetch(`/api/admin/sessions/master?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) await reload();
      else console.error("マスター削除に失敗しました");
    } catch (error) {
      console.error("マスター削除エラー:", error);
    }
  };

  const filteredUnplaced = applyUnplacedFilters(unplacedStudents, unplacedFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">セッションマスター管理</h1>
        <div className="flex items-center gap-4">
          <Input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaster ? "マスター編集" : "新規マスター作成"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 生徒（読み取り表示） */}
              <div>
                <Label>生徒</Label>
                <p className="mt-1 text-sm font-medium">{formData.studentName}</p>
              </div>

              {/* 授業時間（開始時刻＋所要時間） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>授業開始時刻</Label>
                  <Input
                    type="time"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>所要時間（分）</Label>
                  <Input
                    type="number"
                    min="15"
                    max="180"
                    step="5"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })
                    }
                  />
                </div>
              </div>

              {/* 講師（プルダウン） */}
              <div>
                <Label>講師</Label>
                <Select
                  value={formData.teacherId || "__none__"}
                  onValueChange={(value) => {
                    if (!value || value === "__none__") {
                      setFormData({ ...formData, teacherId: "", teacherName: "" });
                    } else {
                      const t = teachers.find((x) => x.uid === value);
                      setFormData({
                        ...formData,
                        teacherId: value,
                        teacherName: t?.displayName ?? "",
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="講師を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未割当</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.uid} value={t.uid}>
                        {t.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 形式（オンライン/オフライン トグル） */}
              <div>
                <Label>形式</Label>
                <div className="mt-1 flex gap-2">
                  <Button
                    type="button"
                    variant={formData.format === "offline" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, format: "offline" })}
                  >
                    オフライン
                  </Button>
                  <Button
                    type="button"
                    variant={formData.format === "online" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, format: "online" })}
                  >
                    オンライン
                  </Button>
                </div>
              </div>

              {/* 備考（任意） */}
              <div>
                <Label>備考</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="特記事項があれば記入"
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <div>
                {editingMaster && (
                  <Button
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={async () => {
                      await handleDelete(editingMaster.id);
                      setIsDialogOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave}>
                  {editingMaster ? "更新" : "作成"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleCopyFromPreviousMonth}>
          <Copy className="h-4 w-4 mr-2" />
          前月からコピー
        </Button>

        <Button variant="outline" onClick={handleGenerateSessions}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          スケジュールに複写
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* 週テンプレート（曜日×時間）グリッド */}
          <div className="flex-1 min-w-0">
            <SessionMasterCalendar
              masters={masters}
              onMoveMaster={handleMoveMaster}
              onCreateMaster={handleCreateMaster}
              onDeleteMaster={handleDeleteMaster}
              onEditMaster={handleEdit}
            />
          </div>

          {/* 未配置の生徒（ドラッグでグリッドに配置＝マスター作成） */}
          <div className="w-64 flex-shrink-0 sticky top-4 self-start">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-sm">未配置</h3>
              <Badge variant="secondary" className="text-xs">
                {filteredUnplaced.length}
              </Badge>
            </div>
            <div className="mb-3">
              <UnplacedFilterBar
                students={unplacedStudents}
                value={unplacedFilter}
                onChange={setUnplacedFilter}
              />
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)]">
              {filteredUnplaced.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">
                  {unplacedStudents.length === 0
                    ? "未配置の生徒はいません"
                    : "該当する生徒がいません"}
                </p>
              ) : (
                filteredUnplaced.map((student) => (
                  <Card
                    key={student.uid}
                    className="p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all border-l-4 border-l-amber-400"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("studentId", student.uid);
                      e.dataTransfer.setData("studentName", student.displayName);
                      e.dataTransfer.setData(
                        "frequency",
                        String(student.sessionsPerMonth ?? 1),
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {student.displayName}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {student.sessionsPerMonth ?? 1}回/月
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}