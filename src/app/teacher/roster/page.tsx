"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/shared/PageTransition";
import { getInitials } from "@/lib/utils/avatar";
import type { StudentListItem } from "@/lib/types/admin";

/**
 * 講師の「担当生徒」学習状況ページ。
 * 担当生徒(assignedTeacherIds に自分)の一覧と簡易進捗を表示し、
 * クリックで管理者と同じ読み取り専用の生徒詳細(/admin/students/[id])へ。
 */
export default function TeacherRosterPage() {
  const { data, isLoading } = useAuthSWR<StudentListItem[]>(
    "/api/admin/students"
  );
  const [search, setSearch] = useState("");

  const students = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">担当生徒</h1>
            <p className="text-xs text-muted-foreground">
              担当生徒の学習状況を確認できます（閲覧のみ）
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="生徒を検索..."
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-3 size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                担当生徒がまだ割り当てられていません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <Link
                key={s.uid}
                href={`/admin/students/${s.uid}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
              >
                <Avatar size="default" className="shrink-0">
                  <AvatarImage src={s.photoURL ?? undefined} alt={s.displayName} />
                  <AvatarFallback>{getInitials(s.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.displayName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {typeof s.latestScore === "number" && (
                      <span className="inline-flex items-center gap-0.5">
                        <TrendingUp className="size-3" />
                        最新 {s.latestScore}点
                      </span>
                    )}
                    <span>添削 {s.essayCount}件</span>
                    {s.activeWeaknessCount > 0 && (
                      <span>弱点 {s.activeWeaknessCount}件</span>
                    )}
                    {s.alertFlags.length > 0 && (
                      <Badge variant="destructive" className="gap-0.5 text-[10px]">
                        <AlertTriangle className="size-3" />
                        要注意
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
