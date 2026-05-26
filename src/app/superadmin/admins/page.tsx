"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Shield, Users, Crown, Building2, GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import type { AdminListItem } from "@/lib/types/admin";

type Group = {
  organizationId: string | null;
  organizationName: string;
  members: AdminListItem[];
};

export default function SuperadminAdminsPage() {
  const router = useRouter();
  const { data: rawAdmins, isLoading: loading } = useAuthSWR<AdminListItem[]>(
    "/api/superadmin/admins",
  );
  const admins = rawAdmins ?? [];

  // 塾 (organization) ごとにグルーピング。 未割当は最下部
  const groups = useMemo<Group[]>(() => {
    const byOrg = new Map<string, Group>();
    const unassigned: AdminListItem[] = [];

    for (const admin of admins) {
      if (!admin.organizationId) {
        unassigned.push(admin);
        continue;
      }
      const key = admin.organizationId;
      if (!byOrg.has(key)) {
        byOrg.set(key, {
          organizationId: key,
          organizationName:
            admin.organizationName || `塾 (${key.slice(0, 6)})`,
          members: [],
        });
      }
      byOrg.get(key)!.members.push(admin);
    }

    const result = [...byOrg.values()].map((g) => ({
      ...g,
      members: [...g.members].sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    }));
    result.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
    if (unassigned.length > 0) {
      result.push({
        organizationId: null,
        organizationName: "塾未割当",
        members: unassigned,
      });
    }
    return result;
  }, [admins]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">管理者一覧</h1>
          <p className="text-sm text-muted-foreground">
            塾ごとの管理者 (admin ロール)。 講師は別ページで管理
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/superadmin/teachers">
              <GraduationCap className="mr-2 size-4" />
              講師一覧
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/superadmin/organizations">
              <Building2 className="mr-2 size-4" />
              塾管理
            </Link>
          </Button>
          <Button onClick={() => router.push("/superadmin/admins/new")} className="gap-2">
            <Plus className="size-4" />
            新規管理者追加
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="管理者がまだ登録されていません"
              description="「新規管理者追加」 からアカウントを作成してください"
              action={{ label: "新規管理者追加", href: "/superadmin/admins/new" }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.organizationId ?? "_unassigned"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span>{g.organizationName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {g.members.length} 名
                  </Badge>
                  {g.organizationId && (
                    <Link
                      href={`/superadmin/organizations/${g.organizationId}`}
                      className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      塾の詳細
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">名前</th>
                        <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">メール</th>
                        <th className="px-4 py-2 text-center font-medium">役割</th>
                        <th className="px-4 py-2 text-center font-medium">担当生徒</th>
                        <th className="px-4 py-2 text-center font-medium hidden md:table-cell">作成日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.members.map((admin) => (
                        <tr
                          key={admin.uid}
                          className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent"
                          onClick={() => router.push(`/superadmin/admins/${admin.uid}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {admin.isOwner ? (
                                <Crown className="size-4 text-amber-500" />
                              ) : null}
                              <p className="font-medium">{admin.displayName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-xs text-muted-foreground">
                              {admin.email}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {admin.organizationId ? (
                              admin.isOwner ? (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px] dark:bg-amber-900/30 dark:text-amber-300">
                                  代表
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  子 admin
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                未割当
                              </Badge>
                            )}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
