"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  GraduationCap,
  Building2,
  Shield,
} from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { TeacherListItem } from "@/lib/types/admin";

type Group = {
  organizationId: string | null;
  organizationName: string;
  members: TeacherListItem[];
};

export default function SuperadminTeachersPage() {
  const router = useRouter();
  const { data: rawTeachers, isLoading: loading } = useAuthSWR<TeacherListItem[]>(
    "/api/superadmin/teachers",
  );
  const teachers = rawTeachers ?? [];

  // 塾 (organization) ごとにグルーピング
  const groups = useMemo<Group[]>(() => {
    const byOrg = new Map<string, Group>();
    const unassigned: TeacherListItem[] = [];

    for (const t of teachers) {
      if (!t.organizationId) {
        unassigned.push(t);
        continue;
      }
      const key = t.organizationId;
      if (!byOrg.has(key)) {
        byOrg.set(key, {
          organizationId: key,
          organizationName: t.organizationName || `塾 (${key.slice(0, 6)})`,
          members: [],
        });
      }
      byOrg.get(key)!.members.push(t);
    }

    const result = [...byOrg.values()].map((g) => ({
      ...g,
      members: [...g.members].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
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
  }, [teachers]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">講師一覧</h1>
          <p className="text-sm text-muted-foreground">
            塾ごとの講師 (teacher ロール)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/superadmin/admins">
              <Shield className="mr-2 size-4" />
              管理者一覧
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/superadmin/organizations">
              <Building2 className="mr-2 size-4" />
              塾管理
            </Link>
          </Button>
          <Button onClick={() => router.push("/superadmin/teachers/new")} className="gap-2">
            <Plus className="size-4" />
            新規講師追加
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <GraduationCap className="size-8" />
            <p className="text-sm">講師がまだ登録されていません</p>
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
                <div className="overflow-x-auto" data-allow-x-scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">名前</th>
                        <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">メール</th>
                        <th className="px-4 py-2 text-center font-medium">担当生徒</th>
                        <th className="px-4 py-2 text-center font-medium hidden md:table-cell">作成日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.members.map((teacher) => (
                        <tr
                          key={teacher.uid}
                          className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent"
                          onClick={() => router.push(`/superadmin/teachers/${teacher.uid}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="size-4 text-muted-foreground" />
                              <p className="font-medium">{teacher.displayName}</p>
                            </div>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
