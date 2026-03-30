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
import { GraduationCap, UserPlus, Copy, Check, Users, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { TeacherListItem } from "@/lib/types/admin";

interface TeacherWithStudents extends TeacherListItem {
  students?: { uid: string; displayName: string; email: string }[];
}

export default function AdminTeachersPage() {
  const { data: rawData, isLoading } = useAuthSWR<TeacherListItem[]>("/api/admin/teachers");
  const teachers = rawData ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [studentsByTeacher, setStudentsByTeacher] = useState<
    Record<string, { uid: string; displayName: string; email: string }[]>
  >({});

  async function handleInvite() {
    setInviteLoading(true);
    try {
      const res = await authFetch("/api/admin/teachers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.code) {
        setInviteCode(data.code);
      }
    } catch {
      // エラー時は何もしない
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDialogClose() {
    setInviteOpen(false);
    setInviteCode(null);
    setCopied(false);
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
          <p className="text-sm text-muted-foreground">講師の一覧と招待コード発行</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={(open) => (open ? setInviteOpen(true) : handleDialogClose())}>
          <DialogTrigger
            render={
              <Button>
                <UserPlus className="mr-2 size-4" />
                招待コード発行
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>講師招待コードを発行</DialogTitle>
              <DialogDescription>
                発行されたコードを講師に共有してください。コードは7日間有効です。
              </DialogDescription>
            </DialogHeader>

            {inviteCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border bg-muted px-4 py-3 text-center text-lg font-mono font-bold tracking-widest">
                    {inviteCode}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {copied ? "コピーしました" : "コードをコピーして講師に共有してください"}
                </p>
              </div>
            ) : (
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviteLoading}>
                  {inviteLoading ? "発行中..." : "コードを発行する"}
                </Button>
              </DialogFooter>
            )}
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
              description="招待コードを発行して講師を追加してください"
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
