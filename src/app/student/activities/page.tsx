"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { PenLine, CheckCircle, AlertCircle, Sparkles, Award } from "lucide-react";
import type { Activity } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";
import { useAuthSWR } from "@/lib/api/swr";
import { ActivityRegisterChat } from "@/components/activities/ActivityRegisterChat";

const CATEGORY_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "すべて" },
  ...Object.entries(ACTIVITY_CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
];

export default function ActivitiesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  // 一覧は全件取得し、フィルタはクライアント側で行う（保存後の mutate を1キーに集約）
  const { data: rawData, isLoading: loading, mutate } = useAuthSWR<{ activities: Activity[] }>(
    "/api/activities"
  );
  const all = rawData?.activities ?? [];
  const activities = filter === "all" ? all : all.filter((a) => a.category === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-6">
      <div className="flex items-center justify-between gap-2 mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
          <Award className="size-5 text-amber-500" />
          活動実績
        </h1>
        <Button variant="outline" size="sm" onClick={() => router.push("/student/activities/new")}>
          <PenLine className="size-4 mr-1" />
          手動で入力
        </Button>
      </div>

      {/* 左: AI対話で追加 / 右: 登録済み活動カード */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左カラム: AI対話 */}
        <div className="w-full lg:flex-1 lg:min-w-0">
          <ActivityRegisterChat onSaved={() => mutate()} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            AIと対話するだけで、動機・行動・成果・学び・接続まで整理して登録できます
          </p>
        </div>

        {/* 右カラム: 登録済み */}
        <div className="w-full space-y-3 lg:w-[360px] lg:shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">登録済みの活動</h2>
            <span className="text-xs text-muted-foreground">{all.length}件</span>
          </div>

          <SegmentControl value={filter} onChange={setFilter} options={CATEGORY_FILTERS} size="sm" />

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-5 bg-muted rounded animate-pulse w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              {all.length === 0
                ? "まだ活動がありません。左でAIと対話して追加しましょう。"
                : "このカテゴリの活動はありません。"}
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/student/activities/${activity.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{activity.title}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {ACTIVITY_CATEGORY_LABELS[activity.category]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activity.period.start} ~ {activity.period.end || "現在"}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {activity.description}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
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
      </div>
    </div>
  );
}
