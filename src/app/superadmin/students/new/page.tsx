"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { AdminListItem } from "@/lib/types/admin";

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [managedBy, setManagedBy] = useState("__none__");
  const [admins, setAdmins] = useState<AdminListItem[]>([]);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const res = await authFetch("/api/superadmin/admins");
        if (res.ok) {
          const data = await res.json();
          setAdmins(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      }
    }
    fetchAdmins();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !displayName || !password) {
      toast.error("必須項目を入力してください");
      return;
    }
    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/superadmin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName,
          password,
          school: school || undefined,
          grade: grade ? parseInt(grade) : undefined,
          managedBy: managedBy === "__none__" ? undefined : managedBy,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "作成に失敗しました");
      }
      toast.success("生徒を作成しました");
      router.push("/superadmin/students");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/students")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新規生徒追加</h1>
          <p className="text-sm text-muted-foreground">新しい生徒アカウントを作成します</p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">アカウント情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                メールアドレス <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-medium">
                名前 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="生徒名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                パスワード <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="6文字以上"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school" className="text-xs font-medium">
                学校名
              </Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="東京都立○○高校"
              />
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
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />}
                作成
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/superadmin/students")}>
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
