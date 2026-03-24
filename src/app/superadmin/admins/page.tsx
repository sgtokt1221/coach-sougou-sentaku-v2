"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Shield, Users, Ticket, Copy, Check, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { AdminListItem } from "@/lib/types/admin";
import type { Invitation } from "@/lib/types/invitation";

export default function SuperadminAdminsPage() {
  const router = useRouter();
  const { data: rawAdmins, isLoading: loading } = useAuthSWR<AdminListItem[]>("/api/superadmin/admins");
  const admins = rawAdmins ?? [];
  const { data: rawInvitations, isLoading: invLoading, mutate: mutateInvitations } = useAuthSWR<Invitation[]>("/api/superadmin/invitations");
  const [localInvitations, setLocalInvitations] = useState<Invitation[] | null>(null);
  const invitations = localInvitations ?? rawInvitations ?? [];
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      const res = await authFetch("/api/superadmin/invitations", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setGeneratedCode(data.code);
      setLocalInvitations((prev) => [data, ...(prev ?? rawInvitations ?? [])]);
      toast.success("招待コードを発行しました");
    } catch {
      toast.error("招待コード発行に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyCode() {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("コピーしました");
    setTimeout(() => setCopied(false), 2000);
  }

  function getStatusBadge(inv: Invitation) {
    const now = new Date();
    const expires = new Date(inv.expiresAt);
    if (inv.status === "used") return <Badge variant="secondary">使用済み</Badge>;
    if (inv.status === "expired" || expires < now) return <Badge variant="destructive">期限切れ</Badge>;
    return <Badge variant="default">有効</Badge>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理者一覧</h1>
          <p className="text-sm text-muted-foreground">管理者・講師アカウントを管理します</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateCode} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
            招待コード発行
          </Button>
          <Button onClick={() => router.push("/superadmin/admins/new")} className="gap-2">
            <Plus className="size-4" />
            新規管理者追加
          </Button>
        </div>
      </div>

      {/* Generated code dialog */}
      {generatedCode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">招待コードが発行されました</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{generatedCode}</p>
              <p className="mt-1 text-xs text-muted-foreground">7日間有効 / 1回のみ使用可能</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-1.5">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "コピー済み" : "コピー"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedCode(null)}>
                閉じる
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="管理者がまだ登録されていません"
              description="「新規管理者追加」からアカウントを作成してください"
              action={{ label: "新規管理者追加", href: "/superadmin/admins/new" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">メール</th>
                    <th className="px-4 py-3 text-center font-medium">ロール</th>
                    <th className="px-4 py-3 text-center font-medium">担当生徒</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr
                      key={admin.uid}
                      className="cursor-pointer border-b transition-colors hover:bg-accent"
                      onClick={() => router.push(`/superadmin/admins/${admin.uid}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{admin.displayName}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={admin.role === "admin" ? "default" : "secondary"}>
                          {admin.role === "admin" ? "管理者" : "講師"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {admin.studentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation codes table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">招待コード一覧</h2>
        <Card>
          <CardContent className="p-0">
            {invLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Ticket className="size-8" />
                <p className="text-sm">招待コードはまだ発行されていません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">コード</th>
                      <th className="px-4 py-3 text-center font-medium">ステータス</th>
                      <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">使用者</th>
                      <th className="px-4 py-3 text-center font-medium hidden md:table-cell">発行日</th>
                      <th className="px-4 py-3 text-center font-medium hidden md:table-cell">有効期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.code} className="border-b">
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{inv.code}</code>
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(inv)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                          {inv.usedEmail ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString("ja-JP")}
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
    </div>
  );
}
