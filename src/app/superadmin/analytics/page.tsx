"use client";

import { useState } from "react";
import { BarChart3, School, MessageSquare, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { UniversityAggregateTable } from "@/components/superadmin/UniversityAggregateTable";
import { WeaknessAggregateTable } from "@/components/superadmin/WeaknessAggregateTable";
import type {
  UniversityAggregateResponse,
  WeaknessAggregateResponse,
} from "@/lib/types/superadmin-analytics";

type TabId = "universities" | "essay" | "interview";

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: "universities", label: "志望校別", icon: School },
  { id: "essay", label: "小論文弱点", icon: MessageSquare },
  { id: "interview", label: "面接弱点", icon: Mic },
];

export default function SuperadminAnalyticsPage() {
  const [tab, setTab] = useState<TabId>("universities");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">全体分析</h1>
          <p className="text-sm text-muted-foreground">
            塾全体の志望校分布と弱点傾向を確認できます。
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === id
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "universities" && <UniversityTab />}
      {tab === "essay" && <WeaknessTab source="essay" />}
      {tab === "interview" && <WeaknessTab source="interview" />}
    </div>
  );
}

function UniversityTab() {
  const { data, isLoading, error } = useAuthSWR<UniversityAggregateResponse>(
    "/api/superadmin/analytics/universities"
  );
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">データ取得に失敗しました。</p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">志望校ランキング (学部単位)</CardTitle>
      </CardHeader>
      <CardContent>
        <UniversityAggregateTable
          aggregates={data?.aggregates ?? []}
          totalStudents={data?.totalStudents ?? 0}
        />
      </CardContent>
    </Card>
  );
}

function WeaknessTab({ source }: { source: "essay" | "interview" }) {
  const { data, isLoading, error } = useAuthSWR<WeaknessAggregateResponse>(
    `/api/superadmin/analytics/weaknesses?source=${source}`
  );
  const title = source === "essay" ? "小論文の弱点ランキング" : "面接の弱点ランキング";
  const emptyLabel =
    source === "essay"
      ? "まだ小論文添削の弱点データがありません。"
      : "まだ面接の弱点データがありません。";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">データ取得に失敗しました。</p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <WeaknessAggregateTable
          aggregates={data?.aggregates ?? []}
          totalRecords={data?.totalRecords ?? 0}
          emptyLabel={emptyLabel}
        />
      </CardContent>
    </Card>
  );
}
