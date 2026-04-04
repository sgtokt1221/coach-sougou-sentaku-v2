"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Save, Trash2, GraduationCap, FileText } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { AdminListItem } from "@/lib/types/admin";

interface StudentDetailData {
  uid: string;
  displayName: string;
  email: string;
  school: string;
  grade: number | null;
  managedBy: string;
  managedByName: string;
  targetUniversities: string[];
  createdAt: string;
  latestScore: number | null;
  essayCount: number;
}

export default function SuperadminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [resolvedUnis, setResolvedUnis] = useState<string[]>([]);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [managedBy, setManagedBy] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentRes, adminsRes] = await Promise.all([
          authFetch(`/api/superadmin/students/${id}`),
          authFetch("/api/superadmin/admins"),
        ]);
        if (studentRes.ok) {
          const data: StudentDetailData = await studentRes.json();
          setStudent(data);
          setDisplayName(data.displayName);
          setSchool(data.school);
          setGrade(data.grade?.toString() ?? "");
          setManagedBy(data.managedBy || "__none__");
        }
        if (adminsRes.ok) {
          const data = await adminsRes.json();
          setAdmins(Array.isArray(data) ? data : []);
        }
      } catch {
        // handled by API
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    const ids = student?.targetUniversities ?? [];
    if (ids.length === 0) { setResolvedUnis([]); return; }
    fetch(`/api/universities/resolve?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setResolvedUnis((d.resolved ?? []).map((r: { universityName: string; facultyName: string }) => `${r.universityName} ${r.facultyName}`)))
      .catch(() => setResolvedUnis([]));
  }, [student?.targetUniversities]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`/api/superadmin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          school,
          grade: grade ? parseInt(grade) : null,
          managedBy: managedBy === "__none__" ? "" : managedBy,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("生徒情報を更新しました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("この生徒アカウントを無効化しますか?")) return;
    try {
      const res = await authFetch(`/api/superadmin/students/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("アカウントを無効化しました");
      router.push("/superadmin/students");
    } catch {
      toast.error("無効化に失敗しました");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">生徒が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/students")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{student.displayName}</h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">最新スコア</p>
            <p className="text-xl font-bold">
              {student.latestScore !== null ? student.latestScore : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <FileText className="size-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">添削数</p>
            </div>
            <p className="text-xl font-bold">{student.essayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">担当</p>
            <p className="text-sm font-medium">
              {student.managedByName || (
                <Badge variant="destructive" className="text-xs">未割当</Badge>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <GraduationCap className="size-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">志望校</p>
            </div>
            <p className="text-sm font-medium">
              {resolvedUnis.length > 0
                ? resolvedUnis.join(", ")
                : student.targetUniversities.length > 0
                  ? student.targetUniversities.join(", ")
                  : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール編集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">名前</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">学校</Label>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="学校名" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">学年</Label>
              <Select value={grade} onValueChange={(v) => { if (v) setGrade(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="学年を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1年</SelectItem>
                  <SelectItem value="2">2年</SelectItem>
                  <SelectItem value="3">3年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">担当管理者/講師</Label>
              <Select value={managedBy} onValueChange={(v) => { if (v) setManagedBy(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="担当を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未割当</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.uid} value={a.uid}>
                      {a.displayName}（{a.role === "admin" ? "管理者" : "講師"}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete}>
              <Trash2 className="size-4" />
              アカウント無効化
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
