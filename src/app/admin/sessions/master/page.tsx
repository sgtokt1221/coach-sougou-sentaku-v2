"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, CalendarPlus, Trash2, Edit } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { SessionMaster } from "@/lib/types/teacher-shift";

const DAYS_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const SESSION_TYPES = [
  { value: "coaching", label: "コーチング" },
  { value: "mock_interview", label: "模擬面接" },
  { value: "essay_review", label: "小論文添削" },
  { value: "general", label: "一般指導" },
];

export default function SessionMasterPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [masters, setMasters] = useState<SessionMaster[]>([]);
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
    type: "coaching" as const,
    duration: 60,
    notes: "",
  });

  useEffect(() => {
    loadMasters();
  }, [currentMonth]);

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
        await loadMasters();
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
        await loadMasters();
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
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaster ? "マスター編集" : "新規マスター作成"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>生徒ID</Label>
                <Input
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="student123"
                />
              </div>
              <div>
                <Label>生徒名</Label>
                <Input
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="田中太郎"
                />
              </div>
              <div>
                <Label>月あたり回数</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>希望曜日（任意）</Label>
                <Select
                  value={formData.preferredDay?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferredDay: value ? parseInt(value) : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="指定しない" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">指定しない</SelectItem>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}曜日
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>希望時間</Label>
                <Input
                  type="time"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                />
              </div>
              <div>
                <Label>セッション種別</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>講師ID（任意）</Label>
                <Input
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  placeholder="teacher123"
                />
              </div>
              <div>
                <Label>講師名（任意）</Label>
                <Input
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  placeholder="山田先生"
                />
              </div>
              <div>
                <Label>時間（分）</Label>
                <Input
                  type="number"
                  min="15"
                  max="180"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div className="col-span-2">
                <Label>備考</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="特記事項があれば記入"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                {editingMaster ? "更新" : "作成"}
              </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>{currentMonth} セッションマスター一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : masters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              マスターが登録されていません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">生徒名</th>
                    <th className="text-left py-3 px-2">講師名</th>
                    <th className="text-left py-3 px-2">希望日時</th>
                    <th className="text-left py-3 px-2">月回数</th>
                    <th className="text-left py-3 px-2">種別</th>
                    <th className="text-left py-3 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {masters.map((master) => (
                    <tr key={master.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{master.studentName}</div>
                          <div className="text-sm text-muted-foreground">{master.studentId}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {master.teacherName ? (
                          <div>
                            <div className="font-medium">{master.teacherName}</div>
                            <div className="text-sm text-muted-foreground">{master.teacherId}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">未割当</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {master.preferredDay !== undefined ? (
                          <div>
                            <div>{DAYS_OF_WEEK[master.preferredDay]}曜日</div>
                            <div className="text-sm text-muted-foreground">{master.preferredTime}</div>
                          </div>
                        ) : (
                          <div>
                            <div>指定なし</div>
                            <div className="text-sm text-muted-foreground">{master.preferredTime}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{master.frequency}回/月</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge>
                          {SESSION_TYPES.find(t => t.value === master.type)?.label || master.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(master)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(master.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}