"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PenLine } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import {
  useUnviewedSubmissions,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import { ChocoReviewDetailDialog } from "@/components/admin/detail-dialogs/ChocoReviewDetailDialog";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";
import type { ChocoReviewListItem } from "@/app/api/admin/students/[id]/choco-reviews/route";

function scoreColor(total: number): string {
  // 合計は 0〜50（computeChocoTotal）。以前は 30点満点の前提で 24/18 だった
  if (total >= 40) return "text-emerald-600";
  if (total >= 30) return "text-sky-600";
  return "text-amber-600";
}

/**
 * ちょこ添削（1段落だけ書く練習）の履歴。
 * 生徒が書いた段落を出し、ドラッグで範囲コメントを付けられるようにする。
 */
export function ChocoReviewsSection({ studentId }: { studentId: string }) {
  const { data: unviewedData } = useUnviewedSubmissions();
  const unviewedCount = unviewedData?.byStudentKind?.[studentId]?.chocoReview ?? 0;
  const { data, isLoading, error } = useAuthSWR<ChocoReviewListItem[]>(
    `/api/admin/students/${studentId}/choco-reviews`,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (error) {
    return <ApiErrorBanner error={error} title="ちょこ添削履歴の取得に失敗しました" />;
  }

  const items = data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="size-4" />
            ちょこ添削
            {items.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {items.length}件
              </span>
            )}
            <TabUnviewedBadge count={unviewedCount} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだちょこ添削の記録がありません
            </p>
          ) : (
            <div className="divide-y">
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.themeTitle || "ちょこ添削"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {r.blankIndex + 1}段落目
                        {r.role ? `（${CHOCO_ROLE_LABELS[r.role]}）` : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("ja-JP")}・
                      {r.wordCount}字
                      {(r.inlineComments?.length ?? 0) > 0 &&
                        `・コメント${r.inlineComments!.length}件`}
                    </p>
                  </div>
                  {r.scores && (
                    <span
                      className={`shrink-0 text-sm font-bold ${scoreColor(r.scores.total)}`}
                    >
                      {r.scores.total} / 50
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ChocoReviewDetailDialog
        studentId={studentId}
        id={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}
