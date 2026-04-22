"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Mail,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { TeacherShiftGrid } from "@/components/admin/TeacherShiftGrid";
import type { TeacherShift, ShiftSlot } from "@/lib/types/teacher-shift";

interface TeacherProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  studentCount?: number;
}

interface TeacherDetail {
  profile: TeacherProfile;
  managedStudents: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
}

export default function AdminTeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params?.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  });
  const [shiftData, setShiftData] = useState<TeacherShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTeacherDetail = async () => {
    try {
      const res = await authFetch(`/api/admin/teachers/${teacherId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "講師詳細の取得に失敗しました");
      }
      const data = await res.json();
      setTeacher(data);
    } catch (error) {
      console.error("Teacher detail error:", error);
      toast.error(error instanceof Error ? error.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const loadShiftData = async (month: string) => {
    setShiftLoading(true);
    try {
      const res = await authFetch(`/api/admin/teachers/${teacherId}/shift?month=${month}`);
      if (!res.ok) {
        throw new Error("シフトデータの取得に失敗しました");
      }
      const data = await res.json();
      setShiftData(data);
    } catch (error) {
      console.error("Shift load error:", error);
      toast.error(error instanceof Error ? error.message : "シフトデータの取得に失敗しました");
      setShiftData(null);
    } finally {
      setShiftLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) {
      loadTeacherDetail();
    }
  }, [teacherId]);

  useEffect(() => {
    if (teacherId && currentMonth) {
      loadShiftData(currentMonth);
    }
  }, [teacherId, currentMonth]);

  const handleMonthChange = (direction: "prev" | "next") => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);

    if (direction === "prev") {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    const newMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    setCurrentMonth(newMonth);
  };

  const handleShiftSave = async (slots: ShiftSlot[]) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/teachers/${teacherId}/shift`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          slots,
          status: "submitted", // 管理者が編集する場合は自動的にsubmitted状態
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "シフトの保存に失敗しました");
      }

      const savedShift = await res.json();
      setShiftData(savedShift);
      toast.success("シフトを保存しました");
    } catch (error) {
      console.error("Shift save error:", error);
      toast.error(error instanceof Error ? error.message : "シフトの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleShiftConfirm = async () => {
    if (!shiftData) return;

    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/teachers/${teacherId}/shift`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          slots: shiftData.slots,
          status: "confirmed",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "シフトの確定に失敗しました");
      }

      const confirmedShift = await res.json();
      setShiftData(confirmedShift);
      toast.success("シフトを確定しました");
    } catch (error) {
      console.error("Shift confirm error:", error);
      toast.error(error instanceof Error ? error.message : "シフトの確定に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: TeacherShift["status"]) => {
    if (!status) return null;

    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="mr-1 size-3" />未提出</Badge>;
      case "submitted":
        return <Badge variant="secondary"><AlertCircle className="mr-1 size-3" />提出済み</Badge>;
      case "confirmed":
        return <Badge variant="default" className="bg-emerald-600"><Check className="mr-1 size-3" />確定</Badge>;
      default:
        return null;
    }
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    return `${year}年${monthNum}月`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-muted-foreground">講師が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{teacher.profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">講師詳細</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-sm">{teacher.profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="text-sm">
                登録日: {new Date(teacher.profile.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm">担当生徒: {teacher.managedStudents.length}名</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              担当生徒
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.managedStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">担当生徒はいません</p>
            ) : (
              <div className="space-y-2">
                {teacher.managedStudents.map((student) => (
                  <div
                    key={student.uid}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm border"
                  >
                    <User className="size-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{student.displayName}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Shift Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">シフト管理</h2>
          <div className="flex items-center gap-2">
            {getStatusBadge(shiftData?.status)}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleMonthChange("prev")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h3 className="text-lg font-medium min-w-[120px] text-center">
            {formatMonth(currentMonth)}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleMonthChange("next")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Shift Grid */}
        {shiftLoading ? (
          <div className="flex justify-center p-8">
            <Skeleton className="h-96 w-full max-w-4xl" />
          </div>
        ) : (
          <div className="space-y-4">
            <TeacherShiftGrid
              teacherId={teacherId}
              month={currentMonth}
              initialSlots={shiftData?.slots || []}
              onSave={handleShiftSave}
              readonly={saving}
            />

            {/* Admin Actions */}
            {shiftData && shiftData.status === "submitted" && (
              <div className="flex justify-end">
                <Button
                  onClick={handleShiftConfirm}
                  disabled={saving}
                  className="gap-2"
                >
                  <Check className="size-4" />
                  シフトを確定
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}