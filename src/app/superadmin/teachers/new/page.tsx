"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { AdminListItem } from "@/lib/types/admin";

export default function NewTeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [managedBy, setManagedBy] = useState("");

  // 担当 admin (= 紐付け先塾) 候補
  const { data: admins } = useAuthSWR<AdminListItem[]>("/api/superadmin/admins");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !displayName || !password) {
      toast.error("全ての項目を入力してください");
      return;
    }
    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    if (!managedBy) {
      toast.error("所属塾の代表 admin を選択してください");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/superadmin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password, managedBy }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "作成に失敗しました");
      }
      toast.success("講師を作成しました");
      router.push("/superadmin/teachers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/teachers")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新規講師追加</h1>
          <p className="text-sm text-muted-foreground">新しい講師アカウントを作成します</p>
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
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="teacher@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-medium">
                名前
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="講師名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                パスワード
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
              <Label htmlFor="managedBy" className="text-xs font-medium">
                所属塾 (代表 admin を選択 → 塾を自動継承)
              </Label>
              <select
                id="managedBy"
                value={managedBy}
                onChange={(e) => setManagedBy(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">— 選択してください —</option>
                {(admins ?? [])
                  .filter((a) => a.organizationId)
                  .map((a) => (
                    <option key={a.uid} value={a.uid}>
                      {a.organizationName} / {a.displayName}
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                選んだ admin と同じ塾の講師として登録されます
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />}
                作成
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/superadmin/teachers")}>
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
