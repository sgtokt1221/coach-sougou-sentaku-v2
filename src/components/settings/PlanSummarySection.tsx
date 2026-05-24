"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ChevronRight } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { UserSubscription } from "@/lib/types/subscription";

const PLAN_LABEL: Record<UserSubscription["plan"], string> = {
  free: "無料プラン",
  standard: "スタンダードプラン",
  document_package: "出願書類パッケージ",
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 設定: プラン セクション。
 * 現在のプラン表示 + 詳細・変更ページへの導線。
 */
export function PlanSummarySection() {
  const { data, isLoading } =
    useAuthSWR<UserSubscription>("/api/subscription/status");

  const plan = data?.plan ?? "free";
  const planLabel = PLAN_LABEL[plan];
  const nextRenew = formatDate(data?.standardSubscription?.currentPeriodEnd);
  const subActive = data?.standardSubscription?.status === "active";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="size-4 text-primary" />
          プラン
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{planLabel}</span>
              {subActive && (
                <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                  有効
                </Badge>
              )}
              {data?.standardSubscription?.cancelAtPeriodEnd && (
                <Badge variant="outline" className="text-[10px]">
                  期間終了で停止予定
                </Badge>
              )}
            </div>
            {nextRenew && (
              <p className="mt-1 text-xs text-muted-foreground">
                次回更新日: {nextRenew}
              </p>
            )}
            {isLoading && (
              <p className="text-xs text-muted-foreground">読み込み中...</p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/student/pricing">
              プラン詳細
              <ChevronRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
