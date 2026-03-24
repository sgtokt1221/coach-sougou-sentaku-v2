"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Plus, ArrowRightLeft } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentListItem, AdminListItem } from "@/lib/types/admin";

type Filter = "all" | "unassigned" | string;

export default function SuperadminStudentsPage() {
  const router = useRouter();
  const { data: rawStudents, isLoading: studentsLoading } = useAuthSWR<StudentListItem[]>("/api/admin/students");
  const { data: rawAdmins } = useAuthSWR<AdminListItem[]>("/api/superadmin/admins");
  const [localStudents, setLocalStudents] = useState<StudentListItem[] | null>(null);
  const students = localStudents ?? rawStudents ?? [];
  const admins = rawAdmins ?? [];
  const loading = studentsLoading;
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [transferMode, setTransferMode] = useState(false);

  const filteredStudents = students.filter((s) => {
    if (filter === "all") return true;
    if (filter === "unassigned") return !s.managedBy;
    return s.managedBy === filter;
  });

  function toggleStudent(uid: string) {
    setSelectedStudents((prev) =>
      prev.includes(uid) ? prev.filter((s) => s !== uid) : [...prev, uid]
    );
  }

  async function handleBulkAction() {
    if (selectedStudents.length === 0 || !assignTarget) return;
    setAssigning(true);
    try {
      const endpoint = transferMode
        ? "/api/superadmin/students/transfer"
        : "/api/superadmin/students/assign";
      const bodyKey = transferMode ? "toAdminUid" : "adminUid";
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUids: selectedStudents, [bodyKey]: assignTarget }),
      });
      if (!res.ok) throw new Error();
      const actionText = transferMode ? "移管" : "割り当て";
      toast.success(`${selectedStudents.length}名の生徒を${actionText}ました`);
      setLocalStudents((prev) =>
        (prev ?? rawStudents ?? []).map((s) =>
          selectedStudents.includes(s.uid) ? { ...s, managedBy: assignTarget } : s
        )
      );
      setSelectedStudents([]);
    } catch {
      toast.error("操作に失敗しました");
    } finally {
      setAssigning(false);
    }
  }

  const adminName = (uid: string) =>
    admins.find((a) => a.uid === uid)?.displayName ?? uid;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">全生徒一覧</h1>
          <p className="text-sm text-muted-foreground">
            全生徒の管理・担当割り当て・移管を行います
          </p>
        </div>
        <Button onClick={() => router.push("/superadmin/students/new")} className="gap-2">
          <Plus className="size-4" />
          新規生徒追加
        </Button>
      </div>

      {/* Filter & Bulk Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">フィルタ:</span>
          <Select value={filter} onValueChange={(v) => { if (v) { setFilter(v); setSelectedStudents([]); } }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="unassigned">未割当のみ</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.uid} value={a.uid}>
                  {a.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedStudents.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={transferMode ? "default" : "outline"}
              size="sm"
              onClick={() => setTransferMode(!transferMode)}
              className="gap-1.5"
            >
              <ArrowRightLeft className="size-3" />
              {transferMode ? "移管モード" : "割り当てモード"}
            </Button>
            <Select value={assignTarget} onValueChange={(v) => { if (v) setAssignTarget(v); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={transferMode ? "移管先を選択" : "割り当て先を選択"} />
              </SelectTrigger>
              <SelectContent>
                {admins.map((a) => (
                  <SelectItem key={a.uid} value={a.uid}>
                    {a.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkAction}
              disabled={!assignTarget || assigning}
              className="gap-2"
              size="sm"
            >
              <UserPlus className="size-4" />
              {assigning ? "処理中..." : `${selectedStudents.length}名を${transferMode ? "移管" : "割り当て"}`}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="該当する生徒がいません"
              description="フィルタ条件を変更してお試しください"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudents.length === filteredStudents.length &&
                          filteredStudents.length > 0
                        }
                        onChange={(e) =>
                          setSelectedStudents(
                            e.target.checked ? filteredStudents.map((s) => s.uid) : []
                          )
                        }
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">メール</th>
                    <th className="px-4 py-3 text-center font-medium">担当管理者</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">最新スコア</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">添削数</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.uid}
                      className="border-b hover:bg-accent/50 cursor-pointer"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.uid)}
                          onChange={() => toggleStudent(s.uid)}
                        />
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={() => router.push(`/superadmin/students/${s.uid}`)}
                      >
                        <p className="font-medium hover:underline">{s.displayName}</p>
                      </td>
                      <td
                        className="px-4 py-3 hidden sm:table-cell"
                        onClick={() => router.push(`/superadmin/students/${s.uid}`)}
                      >
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.managedBy ? (
                          <Badge variant="secondary" className="text-xs">
                            {adminName(s.managedBy)}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            未割当
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {s.latestScore !== null ? (
                          <span className="font-bold">{s.latestScore}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {s.essayCount}
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
