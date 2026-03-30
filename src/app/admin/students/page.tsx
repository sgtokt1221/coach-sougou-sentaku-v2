"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, Users, UserPlus, Filter } from "lucide-react";
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
  const [universityFilter, setUniversityFilter] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("sort", sortKey);
  if (universityFilter) params.set("university", universityFilter);
  const { data: rawData, isLoading } = useAuthSWR<StudentListItem[]>(
    `/api/admin/students?${params.toString()}`
  );
  const students = rawData ?? [];
  const loading = isLoading;

  // フィルタなしの全データから志望校一覧を取得（フィルタ用）
  const allParams = new URLSearchParams();
  allParams.set("sort", sortKey);
  const { data: allStudents } = useAuthSWR<StudentListItem[]>(
    `/api/admin/students?${allParams.toString()}`
  );
  const universityOptions = useMemo(() => {
    if (!allStudents) return [];
    const set = new Set<string>();
    allStudents.forEach((s) => s.targetUniversities.forEach((u) => set.add(u)));
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [allStudents]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "lastActivity", label: "最終活動" },
    { key: "score", label: "スコア" },
    { key: "name", label: "名前" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">生徒一覧</h1>
          <p className="text-sm text-muted-foreground">全生徒の状況を確認できます</p>
        </div>
        <Button onClick={() => router.push("/admin/students/new")}>
          <UserPlus className="mr-2 size-4" />
          生徒を追加
        </Button>
      </div>

      {/* Search, Filter & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="名前・メールで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={universityFilter}
            onValueChange={(v) => setUniversityFilter(v === "all" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder="志望校で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての志望校</SelectItem>
              {universityOptions.map((uni) => (
                <SelectItem key={uni} value={uni}>
                  {uni}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                          {s.targetUniversities.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{s.targetUniversities[0]}</span>
                              {s.targetUniversities.length > 1 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  他{s.targetUniversities.length - 1}校
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
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
