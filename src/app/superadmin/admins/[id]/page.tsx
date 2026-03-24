"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Users, UserPlus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { StudentListItem } from "@/lib/types/admin";

interface AdminDetail {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  students: { uid: string; displayName: string; email: string }[];
}

export default function SuperadminAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [unassignedStudents, setUnassignedStudents] = useState<StudentListItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [adminRes, studentsRes] = await Promise.all([
          authFetch(`/api/superadmin/admins/${id}`),
          authFetch("/api/admin/students"),
        ]);
        if (adminRes.ok) {
          const data = await adminRes.json();
          setAdmin(data);
          setRole(data.role);
        }
        if (studentsRes.ok) {
          const allStudents: StudentListItem[] = await studentsRes.json();
          setUnassignedStudents(
            allStudents.filter((s) => !s.managedBy)
          );
        }
      } catch {
        // mock fallback handled by API
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleRoleChange(newRole: string | null) {
    if (!newRole) return;
    setRole(newRole);
    try {
      const res = await authFetch(`/api/superadmin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      toast.success("ロールを更新しました");
    } catch {
      toast.error("ロール更新に失敗しました");
    }
  }

  async function handleAssign() {
    if (selectedStudents.length === 0) return;
    setAssigning(true);
    try {
      const res = await authFetch("/api/superadmin/students/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUids: selectedStudents, adminUid: id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedStudents.length}名の生徒を割り当てました`);
      setUnassignedStudents((prev) =>
        prev.filter((s) => !selectedStudents.includes(s.uid))
      );
      setSelectedStudents([]);
      // Refresh admin data
      const adminRes = await authFetch(`/api/superadmin/admins/${id}`);
      if (adminRes.ok) setAdmin(await adminRes.json());
    } catch {
      toast.error("割り当てに失敗しました");
    } finally {
      setAssigning(false);
    }
  }

  async function handleDisable() {
    if (!confirm("この管理者アカウントを無効化しますか?")) return;
    try {
      const res = await authFetch(`/api/superadmin/admins/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("アカウントを無効化しました");
      router.push("/superadmin/admins");
    } catch {
      toast.error("無効化に失敗しました");
    }
  }

  function toggleStudent(uid: string) {
    setSelectedStudents((prev) =>
      prev.includes(uid) ? prev.filter((s) => s !== uid) : [...prev, uid]
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">管理者が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/admins")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{admin.displayName}</h1>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">ロール:</span>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理者</SelectItem>
                <SelectItem value="teacher">講師</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">作成日:</span>
            <span className="text-sm">{new Date(admin.createdAt).toLocaleDateString("ja-JP")}</span>
          </div>
          <Button variant="destructive" size="sm" className="gap-2" onClick={handleDisable}>
            <Trash2 className="size-4" />
            アカウント無効化
          </Button>
        </CardContent>
      </Card>

      {/* Assigned Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            担当生徒 ({admin.students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admin.students.length === 0 ? (
            <p className="text-sm text-muted-foreground">担当生徒はいません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">名前</th>
                    <th className="px-4 py-2 text-left font-medium">メール</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.students.map((s) => (
                    <tr key={s.uid} className="border-b">
                      <td className="px-4 py-2 font-medium">{s.displayName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4" />
            生徒割り当て
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unassignedStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">未割当の生徒はいません</p>
          ) : (
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 sticky top-0">
                      <th className="px-4 py-2 text-left font-medium w-10">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === unassignedStudents.length && unassignedStudents.length > 0}
                          onChange={(e) =>
                            setSelectedStudents(
                              e.target.checked ? unassignedStudents.map((s) => s.uid) : []
                            )
                          }
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium">名前</th>
                      <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">メール</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map((s) => (
                      <tr key={s.uid} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => toggleStudent(s.uid)}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.uid)}
                            onChange={() => toggleStudent(s.uid)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-2 font-medium">{s.displayName}</td>
                        <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={handleAssign}
                disabled={selectedStudents.length === 0 || assigning}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                {assigning ? "割り当て中..." : `${selectedStudents.length}名を割り当て`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
