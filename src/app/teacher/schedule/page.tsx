"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import { TeacherShiftGrid } from "@/components/admin/TeacherShiftGrid";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TeacherShift, ShiftSlot } from "@/lib/types/teacher-shift";

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    // デフォルトで翌月を表示
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  });

  const [shift, setShift] = useState<TeacherShift | null>(null);
  const [currentShiftSlots, setCurrentShiftSlots] = useState<ShiftSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"pending" | "submitted" | "confirmed">("pending");

  useEffect(() => {
    loadShift();
  }, [currentMonth]);

  const loadShift = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/teacher/shift?month=${currentMonth}`);

      if (response.ok) {
        const data = await response.json();
        setShift(data);
        setCurrentShiftSlots(data.slots || []);
        setSubmitStatus(data.status || "pending");
      } else if (response.status === 404) {
        // シフトが未作成の場合
        setShift(null);
        setCurrentShiftSlots([]);
        setSubmitStatus("pending");
      } else {
        console.error("シフト取得失敗");
      }
    } catch (error) {
      console.error("シフト取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotsChange = (newSlots: ShiftSlot[]) => {
    setCurrentShiftSlots(newSlots);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const payload = {
        teacherId: user.uid,
        month: currentMonth,
        slots: currentShiftSlots,
        status: "pending" as const,
      };

      const response = await authFetch("/api/teacher/shift", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedShift = await response.json();
        setShift(updatedShift);
        setSubmitStatus("pending");
        alert("シフトを保存しました");
      } else {
        console.error("保存失敗");
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm("シフトを提出しますか？提出後は管理者の確認を待つことになります。")) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        teacherId: user?.uid,
        month: currentMonth,
        slots: currentShiftSlots,
        status: "submitted" as const,
      };

      const response = await authFetch("/api/teacher/shift", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedShift = await response.json();
        setShift(updatedShift);
        setSubmitStatus("submitted");
        alert("シフトを提出しました");
      } else {
        console.error("提出失敗");
        alert("提出に失敗しました");
      }
    } catch (error) {
      console.error("提出エラー:", error);
      alert("提出エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (submitStatus) {
      case "pending":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />下書き</Badge>;
      case "submitted":
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" />提出済み</Badge>;
      case "confirmed":
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />確認済み</Badge>;
      default:
        return <Badge variant="outline">未定</Badge>;
    }
  };

  const isDeadlineApproaching = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const isCurrentMonth = currentMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 翌月シフトの締切は当月25日
    return isCurrentMonth && currentDay >= 20;
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">シフト入力</h1>
          <p className="text-muted-foreground">
            勤務可能な時間帯を入力してください
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-40"
          />
          {getStatusBadge()}
        </div>
      </div>

      {/* 締切アラート */}
      {isDeadlineApproaching() && submitStatus === "pending" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-3" />
              <div>
                <div className="font-medium text-orange-800">
                  提出期限が近づいています
                </div>
                <div className="text-sm text-orange-700">
                  毎月25日までに翌月のシフトを提出してください。
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 現在のシフト状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {currentMonth} シフト状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {currentShiftSlots.length}
              </div>
              <div className="text-sm text-muted-foreground">
                登録コマ数
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {shift?.submittedAt ? "提出済み" : "未提出"}
              </div>
              <div className="text-sm text-muted-foreground">
                提出状況
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {shift?.confirmedAt ? "確認済み" : "未確認"}
              </div>
              <div className="text-sm text-muted-foreground">
                管理者確認
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* シフト入力グリッド */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">読み込み中...</div>
          </CardContent>
        </Card>
      ) : (
        <TeacherShiftGrid
          teacherId={user?.uid || ""}
          month={currentMonth}
          initialSlots={currentShiftSlots}
          onSave={handleSlotsChange}
          readonly={submitStatus === "confirmed"}
        />
      )}

      {/* アクションボタン */}
      {submitStatus !== "confirmed" && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || currentShiftSlots.length === 0}
          >
            下書き保存
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || currentShiftSlots.length === 0 || submitStatus === "submitted"}
          >
            {saving ? "処理中..." : "提出する"}
          </Button>
        </div>
      )}

      {submitStatus === "confirmed" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <div className="font-medium text-green-800">
                  シフトが確認されました
                </div>
                <div className="text-sm text-green-700">
                  管理者によりシフトが確認済みです。変更が必要な場合は管理者にご連絡ください。
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用方法 */}
      <Card>
        <CardHeader>
          <CardTitle>使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <strong>1. 時間帯の選択</strong><br />
            グリッドをクリックまたはドラッグして勤務可能な時間帯を選択してください。
          </div>
          <div className="text-sm">
            <strong>2. 下書き保存</strong><br />
            作業途中でも「下書き保存」で内容を保存できます。
          </div>
          <div className="text-sm">
            <strong>3. 提出</strong><br />
            内容に問題がなければ「提出する」で管理者に送信してください。
          </div>
          <div className="text-sm">
            <strong>4. 締切</strong><br />
            毎月25日までに翌月のシフトを提出してください。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}