"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenLine } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { InlineCommentableText } from "@/components/essay/InlineCommentableText";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";
import type { ChocoReviewListItem } from "@/app/api/admin/students/[id]/choco-reviews/route";

function scoreColor(total: number): string {
  if (total >= 24) return "text-emerald-600";
  if (total >= 18) return "text-sky-600";
  return "text-amber-600";
}

/**
 * ちょこ添削（1段落だけ書く練習）の履歴。
 * 生徒が書いた段落を出し、ドラッグで範囲コメントを付けられるようにする。
 */
export function ChocoReviewsSection({ studentId }: { studentId: string }) {
  // 範囲コメントの削除可否判定に使う
  const { user, userProfile } = useAuth();
  const { data, isLoading, error } = useAuthSWR<ChocoReviewListItem[]>(
    `/api/admin/students/${studentId}/choco-reviews`,
  );
  const [selected, setSelected] = useState<ChocoReviewListItem | null>(null);

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
                  onClick={() => setSelected(r)}
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
                      {r.scores.total} / 30
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selected?.themeTitle || "ちょこ添削"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {selected.blankIndex + 1}段落目
                  {selected.role ? `（${CHOCO_ROLE_LABELS[selected.role]}）` : ""}
                </Badge>
                {selected.scores && (
                  <span className="text-xs text-muted-foreground">
                    論理 {selected.scores.logic} / つながり{" "}
                    {selected.scores.coherence} / 表現 {selected.scores.expression}
                  </span>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  生徒が書いた段落（ドラッグでコメント）
                </p>
                <InlineCommentableText
                  target="chocoReview"
                  id={selected.id}
                  studentId={studentId}
                  text={selected.studentText}
                  initialComments={selected.inlineComments}
                  mode="edit"
                  viewerUid={user?.uid}
                  viewerRole={userProfile?.role}
                />
              </div>

              {selected.feedbackOverall && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    AI講評
                  </p>
                  <p className="text-sm leading-relaxed">
                    {selected.feedbackOverall}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
