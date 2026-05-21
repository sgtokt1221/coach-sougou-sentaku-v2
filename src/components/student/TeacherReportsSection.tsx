"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, ChevronRight } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { GrowthReport } from "@/lib/types/growth-report";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

/**
 * 生徒側「先生からのレポート」セクション。
 *
 * `/student/growth` 等に組み込み、管理者・講師が作成した成長レポート
 * (sharedWithStudent !== false のもの) を一覧表示する。
 * クリックで専用画面 `/student/growth/reports/[reportId]` に遷移。
 *
 * レポートが 1 件も無ければ何も描画しない (空状態のノイズを避ける)。
 */
export function TeacherReportsSection() {
  const { data: reports, isLoading } = useAuthSWR<GrowthReport[]>(
    "/api/student/reports",
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="size-4" />
            先生からのレポート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="size-4 text-teal-600" />
          先生からのレポート
          <Badge variant="secondary" className="text-xs">
            {reports.length} 件
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/student/growth/reports/${r.id}`}
              className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {r.period === "weekly" ? "週次" : "月次"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatDate(r.startDate)} 〜 {formatDate(r.endDate)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.overallAssessment}
                </p>
                {r.teacherComment && (
                  <p className="mt-1 line-clamp-1 text-xs text-purple-600 dark:text-purple-400">
                    講師コメントあり
                  </p>
                )}
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
