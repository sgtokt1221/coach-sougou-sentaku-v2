"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentListItem } from "@/lib/types/admin";

/**
 * 講師詳細ページの「メッセージ担当生徒」割り当て。
 * トグルすると生徒の assignedTeacherId にこの講師を設定/解除し、
 * 生徒↔講師メッセージが有効になる。
 */
export function TeacherStudentAssignment({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const { data, isLoading, mutate } = useAuthSWR<StudentListItem[]>(
    "/api/admin/students"
  );
  const [search, setSearch] = useState("");
  const [savingUid, setSavingUid] = useState<string | null>(null);

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

  async function toggle(student: StudentListItem, assign: boolean) {
    setSavingUid(student.uid);
    try {
      const res = await authFetch(
        `/api/admin/students/${student.uid}/assign-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId: assign ? teacherId : null }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "割り当てに失敗しました");
      }
      // 楽観更新: ローカルキャッシュの assignedTeacherId を書き換え
      mutate(
        (prev) =>
          (prev ?? []).map((s) =>
            s.uid === student.uid
              ? { ...s, assignedTeacherId: assign ? teacherId : undefined }
              : s
          ),
        { revalidate: false }
      );
      toast.success(
        assign
          ? `${student.displayName} さんを割り当てました`
          : `${student.displayName} さんの割り当てを解除しました`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "割り当てに失敗しました");
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          メッセージ担当生徒
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          割り当てた生徒は {teacherName} 先生とメッセージできるようになります。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
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
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : students.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            生徒が見つかりません。
          </p>
        ) : (
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {students.map((s) => {
              const assignedHere = s.assignedTeacherId === teacherId;
              const assignedElsewhere =
                !!s.assignedTeacherId && s.assignedTeacherId !== teacherId;
              return (
                <div
                  key={s.uid}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.displayName}
                    </p>
                    {assignedElsewhere && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        他の講師に割当済み（切り替えると移動します）
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={assignedHere}
                    disabled={savingUid === s.uid}
                    onCheckedChange={(c) => toggle(s, c)}
                    aria-label={`${s.displayName} を割り当て`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
