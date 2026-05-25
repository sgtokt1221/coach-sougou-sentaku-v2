"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Building2, Users, GraduationCap, Wrench } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { OrganizationListItem } from "@/lib/types/organization";

export default function SuperadminOrganizationsPage() {
  const { data, isLoading, mutate } = useAuthSWR<{ items: OrganizationListItem[] }>(
    "/api/superadmin/organizations",
  );
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<unknown>(null);

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
        <Button onClick={runBackfill} disabled={backfilling}>
          {backfilling ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 size-4" />
          )}
          既存データ移行
        </Button>
      </div>

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
            まだ組織がありません。 「既存データ移行」 を押すと既存 admin から自動作成されます。
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
