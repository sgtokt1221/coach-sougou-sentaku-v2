"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle, AlertCircle, Sparkles, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Activity, ActivityCategory } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";
import { useAuthSWR } from "@/lib/api/swr";

const CATEGORY_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "すべて" },
  ...Object.entries(ACTIVITY_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function ActivitiesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  const apiKey = filter === "all" ? "/api/activities" : `/api/activities?category=${filter}`;
  const { data: rawData, isLoading: loading } = useAuthSWR<{ activities: Activity[] }>(apiKey);
  const activities = rawData?.activities ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold">活動実績</h1>
        <Button onClick={() => router.push("/student/activities/new")}>
          <Plus className="size-4 mr-1" />
          新規登録
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <div className="overflow-x-auto">
          <TabsList className="flex flex-nowrap h-auto gap-1 w-max">
            {CATEGORY_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs whitespace-nowrap">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded animate-pulse w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardList}
              title="活動実績がありません"
              description="「新規登録」から活動実績を追加してください"
              action={{ label: "新規登録", href: "/student/activities/new" }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/student/activities/${activity.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{activity.title}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {ACTIVITY_CATEGORY_LABELS[activity.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.period.start} ~ {activity.period.end || "現在"}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {activity.structuredData ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle className="size-3" />
                        構造化済
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                        <AlertCircle className="size-3" />
                        未構造化
                      </Badge>
                    )}
                    {activity.optimizations.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Sparkles className="size-3" />
                        AP最適化 {activity.optimizations.length}件
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
