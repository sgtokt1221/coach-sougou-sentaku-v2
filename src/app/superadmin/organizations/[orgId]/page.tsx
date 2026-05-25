"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, UserPlus, X, Crown } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";

interface OrgDetail {
  id: string;
  name: string;
  ownerAdminUid: string;
  members: { uid: string; displayName: string; email: string; isOwner: boolean }[];
  studentCount: number;
  teacherCount: number;
  createdAt: string | null;
}

interface AdminCandidate {
  uid: string;
  displayName: string;
  email: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data, isLoading, mutate } = useAuthSWR<OrgDetail>(
    `/api/superadmin/organizations/${orgId}`,
  );
  const { data: adminsData } = useAuthSWR<{ admins: AdminCandidate[] }>(
    "/api/superadmin/admins",
  );

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingUid, setAddingUid] = useState("");

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("更新しました");
      setEditingName(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async () => {
    if (!addingUid) return;
    try {
      const res = await authFetch(
        `/api/superadmin/organizations/${orgId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminUid: addingUid }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("子 admin を追加しました");
      setAddingUid("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "追加失敗");
    }
  };

  const removeAdmin = async (uid: string, displayName: string) => {
    if (!confirm(`${displayName} を子 admin から除外しますか?`)) return;
    try {
      const res = await authFetch(
        `/api/superadmin/organizations/${orgId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminUid: uid }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("除外しました");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "除外失敗");
    }
  };

  if (isLoading)
    return (
      <div className="p-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!data) return <div className="p-6">組織が見つかりません</div>;

  // 追加候補 = 現メンバー以外の admin
  const memberUids = new Set(data.members.map((m) => m.uid));
  const candidates = (adminsData?.admins ?? []).filter(
    (a) => !memberUids.has(a.uid),
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">塾情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">塾名:</span>
            {editingName ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={saveName} size="sm" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(false)}
                >
                  キャンセル
                </Button>
              </>
            ) : (
              <>
                <span className="font-semibold">{data.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setName(data.name);
                    setEditingName(true);
                  }}
                >
                  編集
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">講師 {data.teacherCount}</Badge>
            <Badge variant="outline">生徒 {data.studentCount}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">所属 admin (親 / 子)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {data.members.map((m) => (
              <li
                key={m.uid}
                className="flex items-center justify-between rounded border p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  {m.isOwner ? (
                    <Crown className="size-4 text-amber-500" />
                  ) : (
                    <UserPlus className="size-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{m.displayName}</span>
                  <span className="text-xs text-muted-foreground">{m.email}</span>
                  {m.isOwner && (
                    <Badge variant="default" className="text-[10px]">
                      親 admin (代表)
                    </Badge>
                  )}
                </div>
                {!m.isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(m.uid, m.displayName)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 border-t pt-3">
            <select
              value={addingUid}
              onChange={(e) => setAddingUid(e.target.value)}
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">子 admin を追加…</option>
              {candidates.map((a) => (
                <option key={a.uid} value={a.uid}>
                  {a.displayName} ({a.email})
                </option>
              ))}
            </select>
            <Button onClick={addAdmin} disabled={!addingUid}>
              <UserPlus className="mr-1 size-4" />
              追加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
