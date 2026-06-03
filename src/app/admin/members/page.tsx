"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Users } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import type { MemberListItem } from "@/lib/types/admin";

interface MembersResponse {
  organizationId: string | null;
  organizationName: string | null;
  ownerAdminUid: string;
  members: MemberListItem[];
}

export default function AdminMembersPage() {
  const { user } = useAuth();
  const myUid = user?.uid;
  const { data, isLoading, mutate } = useAuthSWR<MembersResponse>("/api/admin/members");

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !displayName || !password) {
      toast.error("全ての項目を入力してください");
      return;
    }
    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "作成に失敗しました");
      }
      toast.success("管理者を追加しました");
      setEmail("");
      setDisplayName("");
      setPassword("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(member: MemberListItem) {
    if (!confirm(`「${member.displayName}」をこの塾の管理者から外しますか？（アカウント自体は削除されません）`)) {
      return;
    }
    setRemovingUid(member.uid);
    try {
      const res = await authFetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: member.uid }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "削除に失敗しました");
      }
      toast.success("塾の管理者から外しました");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setRemovingUid(null);
    }
  }

  const members = data?.members ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">管理者管理</h1>
          <p className="text-sm text-muted-foreground">
            この塾の管理者アカウントを追加・管理します。生徒やメッセージなどのデータは同じ塾の管理者で共有されます。
          </p>
        </div>
      </div>

      {/* 現在のメンバー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            管理者メンバー
            {data?.organizationName ? `（${data.organizationName}）` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">メンバーがいません</p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => {
                const isMe = m.uid === myUid;
                return (
                  <li key={m.uid} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.displayName || "（名前未設定）"}</span>
                        {m.isOwner && (
                          <Badge variant="secondary" className="text-[10px]">
                            代表
                          </Badge>
                        )}
                        {isMe && (
                          <Badge variant="outline" className="text-[10px]">
                            あなた
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    {!m.isOwner && !isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        disabled={removingUid === m.uid}
                        onClick={() => handleRemove(m)}
                      >
                        {removingUid === m.uid ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!isLoading && !data?.organizationId && (
            <p className="mt-3 text-xs text-muted-foreground">
              ※ 管理者を1人追加すると、この塾（組織）が作成され、あなたが代表になります。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 新規管理者を追加 */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4" />
            管理者を追加
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
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
                placeholder="staff@example.com"
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
              <Label htmlFor="password" className="text-xs font-medium">
                初期パスワード
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
            <Button type="submit" disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />}
              追加
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
