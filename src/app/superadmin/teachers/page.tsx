"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, GraduationCap } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { TeacherListItem } from "@/lib/types/admin";

export default function SuperadminTeachersPage() {
  const router = useRouter();
  const { data: rawTeachers, isLoading: loading } = useAuthSWR<TeacherListItem[]>("/api/superadmin/teachers");
  const teachers = rawTeachers ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">講師一覧</h1>
          <p className="text-sm text-muted-foreground">講師アカウントを管理します</p>
        </div>
        <Button onClick={() => router.push("/superadmin/teachers/new")} className="gap-2">
          <Plus className="size-4" />
          新規講師追加
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <GraduationCap className="size-8" />
              <p className="text-sm">講師がまだ登録されていません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">メール</th>
                    <th className="px-4 py-3 text-center font-medium">担当生徒</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.uid}
                      className="cursor-pointer border-b transition-colors hover:bg-accent"
                      onClick={() => router.push(`/superadmin/teachers/${teacher.uid}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{teacher.displayName}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-muted-foreground">{teacher.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {teacher.studentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(teacher.createdAt).toLocaleDateString("ja-JP")}
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
