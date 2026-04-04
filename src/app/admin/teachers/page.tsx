"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, UserPlus, Users, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { TeacherListItem } from "@/lib/types/admin";

export default function AdminTeachersPage() {
  const { data: rawData, isLoading, mutate } = useAuthSWR<TeacherListItem[]>("/api/admin/teachers");
  const teachers = rawData ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [studentsByTeacher, setStudentsByTeacher] = useState<
    Record<string, { uid: string; displayName: string; email: string }[]>
  >({});

  async function handleCreate() {
    if (!newEmail || !newName || !newPassword) {
      toast.error("全ての項目を入力してください");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await authFetch("/api/admin/teachers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, displayName: newName, password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "作成に失敗しました");
      }
      toast.success("講師を追加しました");
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreateLoading(false);
    }
  }

  async function toggleStudents(teacherUid: string) {
    if (expandedTeacher === teacherUid) {
      setExpandedTeacher(null);
      return;
    }
    setExpandedTeacher(teacherUid);
    if (!studentsByTeacher[teacherUid]) {
      try {
        const res = await authFetch(`/api/admin/students?managedBy=${teacherUid}`);
        const data = await res.json();
        const students = (data as { uid: string; displayName: string; email: string }[]).map(
          (s) => ({ uid: s.uid, displayName: s.displayName, email: s.email })
        );
        setStudentsByTeacher((prev) => ({ ...prev, [teacherUid]: students }));
      } catch {
        setStudentsByTeacher((prev) => ({ ...prev, [teacherUid]: [] }));
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">講師管理</h1>
          <p className="text-sm text-muted-foreground">講師の一覧と新規追加</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <UserPlus className="mr-2 size-4" />
                講師を追加
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新規講師を追加</DialogTitle>
              <DialogDescription>
                講師のアカウント情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="teacher-name" className="text-xs font-medium">名前</Label>
                <Input id="teacher-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="講師名" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-email" className="text-xs font-medium">メールアドレス</Label>
                <Input id="teacher-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="teacher@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-password" className="text-xs font-medium">パスワード</Label>
                <Input id="teacher-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6文字以上" minLength={6} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={createLoading} className="gap-2">
                {createLoading && <Loader2 className="size-4 animate-spin" />}
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="講師がまだ登録されていません"
              description="「講師を追加」ボタンから講師を登録してください"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium w-8"></th>
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">メール</th>
                    <th className="px-4 py-3 text-center font-medium">担当生徒数</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const isExpanded = expandedTeacher === teacher.uid;
                    const students = studentsByTeacher[teacher.uid];
                    return (
                      <>
                        <tr
                          key={teacher.uid}
                          className="border-b transition-colors hover:bg-accent cursor-pointer"
                          onClick={() => toggleStudents(teacher.uid)}
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{teacher.displayName}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                            {teacher.email}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">
                              <Users className="mr-1 size-3" />
                              {teacher.studentCount}名
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                            {new Date(teacher.createdAt).toLocaleDateString("ja-JP")}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${teacher.uid}-students`} className="border-b">
                            <td colSpan={5} className="px-8 py-3 bg-muted/30">
                              {!students ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-6 w-48" />
                                  <Skeleton className="h-6 w-40" />
                                </div>
                              ) : students.length === 0 ? (
                                <p className="text-sm text-muted-foreground">担当生徒なし</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    担当生徒一覧
                                  </p>
                                  {students.map((s) => (
                                    <div
                                      key={s.uid}
                                      className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm"
                                    >
                                      <span className="font-medium">{s.displayName}</span>
                                      <span className="text-xs text-muted-foreground">{s.email}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
