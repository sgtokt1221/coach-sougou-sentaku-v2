"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CheckCircle2 } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ACTIVITY_CATEGORY_LABELS, type ActivityCategory } from "@/lib/types/activity";

interface ActivityListItem {
  id: string;
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
  isStructured: boolean;
  updatedAt: string;
}

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  leadership: "bg-purple-100 text-purple-700 border-purple-300",
  volunteer: "bg-green-100 text-green-700 border-green-300",
  research: "bg-blue-100 text-blue-700 border-blue-300",
  club: "bg-orange-100 text-orange-700 border-orange-300",
  internship: "bg-cyan-100 text-cyan-700 border-cyan-300",
  competition: "bg-red-100 text-red-700 border-red-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
};

export function ActivitiesSection({ studentId }: { studentId: string }) {
  const { data, isLoading } = useAuthSWR<ActivityListItem[]>(
    `/api/admin/students/${studentId}/activities`
  );
  const activities = data ?? [];

  // カテゴリ別集計
  const categoryCounts = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4" />
          活動実績
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Briefcase className="size-8" />
            <p>まだ活動実績がありません</p>
          </div>
        ) : (
          <>
            {/* Category summary */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className={CATEGORY_COLORS[cat as ActivityCategory]}
                >
                  {ACTIVITY_CATEGORY_LABELS[cat as ActivityCategory]} {count}件
                </Badge>
              ))}
            </div>

            {/* Activity cards */}
            <div className="space-y-2">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{act.title}</p>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${CATEGORY_COLORS[act.category]}`}
                      >
                        {ACTIVITY_CATEGORY_LABELS[act.category]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {act.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {act.period.start} ~ {act.period.end}
                    </p>
                  </div>
                  <div className="shrink-0 ml-3">
                    {act.isStructured ? (
                      <Badge
                        variant="outline"
                        className="border-green-400 bg-green-50 text-green-700 text-[10px] gap-1"
                      >
                        <CheckCircle2 className="size-3" />
                        AI構造化済み
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        未構造化
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
