"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Building2, Users, GraduationCap, Wrench, Plus } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { OrganizationListItem } from "@/lib/types/organization";

export default function SuperadminOrganizationsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useAuthSWR<{ items: OrganizationListItem[] }>(
    "/api/superadmin/organizations",
  );
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<unknown>(null);

  // 新規塾作成ダイアログ
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", displayName: "", password: "" });

  const canCreate =
    form.name.trim() && form.email.trim() && form.displayName.trim() && form.password.length >= 6;

  const createOrg = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/superadmin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          owner: {
            email: form.email.trim(),
            displayName: form.displayName.trim(),
            password: form.password,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      toast.success("塾を作成しました");
      setCreateOpen(false);
      setForm({ name: "", email: "", displayName: "", password: "" });
      await mutate();
      if (body.id) router.push(`/superadmin/organizations/${body.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const runBackfill = async () => {
    if (
      !confirm(
        "全 admin に対して塾を作成し、 既存生徒に organizationId を遡及付与します (冪等)。 実行?",
      )
    )
      return;
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await authFetch("/api/superadmin/organizations/backfill", {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setBackfillResult(body);
      toast.success("移行完了");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "移行失敗");
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">塾 (Organizations)</h1>
          <p className="text-sm text-muted-foreground">
            塾単位での admin / teacher / student 管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            新規塾作成
          </Button>
          <Button variant="outline" onClick={runBackfill} disabled={backfilling}>
            {backfilling ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 size-4" />
            )}
            既存データ移行
          </Button>
        </div>
      </div>

      {/* 新規塾作成ダイアログ */}
      <Dialog open={createOpen} onOpenChange={(o) => !creating && setCreateOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新規塾作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="org-name">塾名</Label>
              <Input
                id="org-name"
                placeholder="例: つくばゼミナール"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <p className="pt-1 text-xs font-medium text-muted-foreground">代表管理者（この塾の管理者アカウント）</p>
            <div className="space-y-1">
              <Label htmlFor="org-owner-name">代表者名</Label>
              <Input
                id="org-owner-name"
                placeholder="例: 山田 太郎"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-owner-email">メールアドレス</Label>
              <Input
                id="org-owner-email"
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-owner-pw">パスワード（6文字以上）</Label>
              <Input
                id="org-owner-pw"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              キャンセル
            </Button>
            <Button onClick={createOrg} disabled={!canCreate || creating}>
              {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {backfillResult !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">移行結果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px]">
              {JSON.stringify(backfillResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (data?.items ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            まだ塾がありません。 「新規塾作成」 で塾を追加するか、 「既存データ移行」 で既存 admin から自動作成できます。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? []).map((org) => (
            <Link key={org.id} href={`/superadmin/organizations/${org.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="size-4" />
                    {org.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    代表: {org.ownerAdminName}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="mr-1 size-3" />
                      admin {org.memberCount}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      講師 {org.teacherCount}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <GraduationCap className="mr-1 size-3" />
                      生徒 {org.studentCount}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
