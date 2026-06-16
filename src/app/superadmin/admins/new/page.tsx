"use client";

import { useState } from "react";
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
import { useAuthSWR } from "@/lib/api/swr";
import type { OrganizationListItem } from "@/lib/types/organization";

const NO_ORG = "__none__";
const NEW_ORG = "__new__";

export default function NewAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState<string>(NO_ORG);
  const [newOrgName, setNewOrgName] = useState("");

  const { data: orgs, mutate: mutateOrgs } = useAuthSWR<{ items: OrganizationListItem[] }>(
    "/api/superadmin/organizations",
  );

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
    if (role === "admin" && orgId === NEW_ORG && !newOrgName.trim()) {
      toast.error("新しい塾の名前を入力してください");
      return;
    }

    setLoading(true);
    try {
      // 3パターン:
      //  A) 新しい塾を作成 → この管理者を代表(owner)にして塾ごと作成
      //  B) 既存の塾を選択 → その塾のメンバー管理者として作成
      //  C) 未所属 or 講師 → 単独の管理者/講師として作成
      let endpoint: string;
      let payload: Record<string, unknown>;
      let createdOrg = false;
      if (role === "admin" && orgId === NEW_ORG) {
        endpoint = "/api/superadmin/organizations";
        payload = { name: newOrgName.trim(), owner: { email, displayName, password } };
        createdOrg = true;
      } else if (role === "admin" && orgId !== NO_ORG) {
        endpoint = `/api/superadmin/organizations/${orgId}/members`;
        payload = { email, displayName, password };
      } else {
        endpoint = "/api/superadmin/admins";
        payload = { email, displayName, role, password };
      }

      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "作成に失敗しました");
      }
      toast.success(createdOrg ? "塾と代表管理者を作成しました" : "管理者を作成しました");
      if (createdOrg && data.id) {
        await mutateOrgs();
        router.push(`/superadmin/organizations/${data.id}`);
      } else {
        router.push("/superadmin/admins");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/admins")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">管理者・塾の追加</h1>
          <p className="text-sm text-muted-foreground">
            管理者/講師を作成。新しい塾もこの画面から作成できます（代表管理者ごと）
          </p>
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
                placeholder="admin@example.com"
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
                placeholder="管理者名"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ロール</Label>
              <Select value={role} onValueChange={(v) => { if (v) setRole(v as "admin" | "teacher"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="teacher">講師</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "admin" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">所属塾</Label>
                <Select value={orgId} onValueChange={(v) => { if (v) setOrgId(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="塾を選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_ORG}>＋ 新しい塾を作成…</SelectItem>
                    <SelectItem value={NO_ORG}>未所属</SelectItem>
                    {(orgs?.items ?? []).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orgId === NEW_ORG ? (
                  <div className="space-y-1.5 rounded-md border bg-muted/30 p-2">
                    <Label htmlFor="newOrgName" className="text-xs font-medium">
                      新しい塾の名前
                    </Label>
                    <Input
                      id="newOrgName"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="例: つくばゼミナール"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      この管理者を<strong>代表</strong>として新しい塾を作成します。
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    塾を選ぶとその塾の管理者として作成（生徒を共有）。「未所属」も選べます。
                  </p>
                )}
              </div>
            )}
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
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />}
                作成
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/superadmin/admins")}>
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
