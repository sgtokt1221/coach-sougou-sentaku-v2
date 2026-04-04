"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Shield, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import type { AdminListItem } from "@/lib/types/admin";

export default function SuperadminAdminsPage() {
  const router = useRouter();
  const { data: rawAdmins, isLoading: loading } = useAuthSWR<AdminListItem[]>("/api/superadmin/admins");
  const admins = rawAdmins ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理者一覧</h1>
          <p className="text-sm text-muted-foreground">管理者・講師アカウントを管理します</p>
        </div>
        <Button onClick={() => router.push("/superadmin/admins/new")} className="gap-2">
          <Plus className="size-4" />
          新規管理者追加
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
          ) : admins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="管理者がまだ登録されていません"
              description="「新規管理者追加」からアカウントを作成してください"
              action={{ label: "新規管理者追加", href: "/superadmin/admins/new" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">メール</th>
                    <th className="px-4 py-3 text-center font-medium">ロール</th>
                    <th className="px-4 py-3 text-center font-medium">担当生徒</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr
                      key={admin.uid}
                      className="cursor-pointer border-b transition-colors hover:bg-accent"
                      onClick={() => router.push(`/superadmin/admins/${admin.uid}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{admin.displayName}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={admin.role === "admin" ? "default" : "secondary"}>
                          {admin.role === "admin" ? "管理者" : "講師"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {admin.studentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString("ja-JP")}
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
