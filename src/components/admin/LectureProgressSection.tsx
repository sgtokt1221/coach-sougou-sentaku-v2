"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, ChevronDown, AlertTriangle } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { LectureProgressRow } from "@/app/api/admin/students/[id]/lecture-progress/route";

const SCORE_MAXIMUM = 50;

function scoreColor(total: number): string {
  if (total >= SCORE_MAXIMUM * 0.8) return "text-emerald-600";
  if (total >= SCORE_MAXIMUM * 0.6) return "text-amber-600";
  return "text-rose-600";
}

export function LectureProgressSection({ studentId }: { studentId: string }) {
  const {
    data: rows,
    isLoading,
    error,
  } = useAuthSWR<LectureProgressRow[]>(
    `/api/admin/students/${studentId}/lecture-progress`
  );

  const [expanded, setExpanded] = useState(false);

  if (error) {
    return (
      <ApiErrorBanner error={error} title="講座の進みの取得に失敗しました" />
    );
  }
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const items = (rows ?? []).slice().sort((a, b) => a.order - b.order);
  const total = items.length;
  const doneCount = items.filter((r) => r.attempts > 0).length;
  const stuckCount = items.filter((r) => r.stuck).length;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <GraduationCap className="size-4" />
            講座の進み
            <Badge variant="secondary" className="ml-1">
              受講 {doneCount}/{total}
            </Badge>
            {stuckCount > 0 && (
              <Badge
                variant="outline"
                className="border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              >
                <AlertTriangle className="mr-1 size-3" />
                詰まっている講 {stuckCount}件
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`text-muted-foreground size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              講座データがありません
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((row) => (
                <div
                  key={row.lectureId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    row.stuck
                      ? "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20"
                      : ""
                  } ${row.attempts === 0 ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      第{row.order}講 {row.title}
                    </p>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      {row.attempts > 0 ? (
                        <>
                          <span>提出 {row.attempts}回</span>
                          {row.lastAt && (
                            <span>
                              最終{" "}
                              {new Date(row.lastAt).toLocaleDateString("ja-JP")}
                            </span>
                          )}
                          {row.drillRate !== null && (
                            <span>ドリル正答率 {row.drillRate}%</span>
                          )}
                        </>
                      ) : (
                        <span>未受講</span>
                      )}
                      {row.stuck && (
                        <span className="flex items-center gap-1 font-medium text-rose-600">
                          <AlertTriangle className="size-3" />
                          詰まっている
                        </span>
                      )}
                    </div>
                  </div>
                  {row.bestTotal !== null && (
                    <span
                      className={`text-lg font-bold ${scoreColor(row.bestTotal)}`}
                    >
                      {row.bestTotal}/{SCORE_MAXIMUM}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
