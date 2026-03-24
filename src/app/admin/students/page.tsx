"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentListItem } from "@/lib/types/admin";

type SortKey = "lastActivity" | "score" | "name";

function getStatus(s: StudentListItem): "alert" | "inactive" | "active" {
  if (s.alertFlags.includes("repeated_weakness") || s.alertFlags.includes("declining"))
    return "alert";
  if (s.alertFlags.includes("inactive")) return "inactive";
  return "active";
}

function statusBadge(status: "alert" | "inactive" | "active") {
  switch (status) {
    case "alert":
      return <Badge variant="destructive">要注意</Badge>;
    case "inactive":
      return <Badge variant="secondary">非アクティブ</Badge>;
    case "active":
      return <Badge variant="default">アクティブ</Badge>;
  }
}

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("sort", sortKey);
  const { data: rawData, isLoading } = useAuthSWR<StudentListItem[]>(
    `/api/admin/students?${params.toString()}`
  );
  const students = rawData ?? [];
  const loading = isLoading;

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "lastActivity", label: "最終活動" },
    { key: "score", label: "スコア" },
    { key: "name", label: "名前" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">生徒一覧</h1>
        <p className="text-sm text-muted-foreground">全生徒の状況を確認できます</p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="名前・メールで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          {sortOptions.map((opt) => (
            <Button
              key={opt.key}
              variant={sortKey === opt.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "該当する生徒が見つかりません" : "生徒がまだ登録されていません"}
              description={search ? "検索条件を変更してお試しください" : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">志望校</th>
                    <th className="px-4 py-3 text-center font-medium">最新スコア</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">添削回数</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">最終活動</th>
                    <th className="px-4 py-3 text-center font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const status = getStatus(s);
                    return (
                      <tr
                        key={s.uid}
                        className="cursor-pointer border-b transition-colors hover:bg-accent"
                        onClick={() => router.push(`/admin/students/${s.uid}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.displayName}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {s.targetUniversities.length > 0
                              ? s.targetUniversities.join(", ")
                              : "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.latestScore !== null ? (
                            <span className={`font-bold ${scoreColor(s.latestScore)}`}>
                              {s.latestScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {s.essayCount}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                          {s.lastActivityAt
                            ? new Date(s.lastActivityAt).toLocaleDateString("ja-JP")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {statusBadge(status)}
                        </td>
                      </tr>
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
