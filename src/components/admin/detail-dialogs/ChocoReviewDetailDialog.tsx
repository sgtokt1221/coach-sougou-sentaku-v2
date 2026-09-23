"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import { InlineCommentableText } from "@/components/essay/InlineCommentableText";
import { RedPenText } from "@/components/essay/RedPenText";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";
import type { ChocoReviewListItem } from "@/app/api/admin/students/[id]/choco-reviews/route";
import {
  DialogStatusText,
  useMarkViewedOnOpen,
  type DetailDialogProps,
} from "./shared";

/** ちょこ添削1件の詳細。一覧と同じ API（SWR のキャッシュ）から ID で探す */
export function ChocoReviewDetailDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  // 範囲コメントの削除可否判定に使う
  const { user, userProfile } = useAuth();
  const { data, isLoading, error } = useAuthSWR<ChocoReviewListItem[]>(
    id ? `/api/admin/students/${studentId}/choco-reviews` : null,
  );
  useMarkViewedOnOpen("chocoReview", id, studentId);
  const selected = id ? (data?.find((r) => r.id === id) ?? null) : null;

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selected?.themeTitle || "ちょこ添削"}
          </DialogTitle>
        </DialogHeader>
        {selected ? (
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

            {/* 赤ペン。生徒が見ているものと同じ部品で同じ見え方にする */}
            {selected.languageCorrections &&
              selected.languageCorrections.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    赤ペン（{selected.languageCorrections.length}件）
                  </p>
                  <RedPenText
                    text={selected.studentText}
                    corrections={selected.languageCorrections}
                  />
                </div>
              )}
          </div>
        ) : id === null ? null : isLoading ? (
          <DialogStatusText>読み込み中…</DialogStatusText>
        ) : error ? (
          <DialogStatusText>ちょこ添削の取得に失敗しました</DialogStatusText>
        ) : (
          <DialogStatusText>見つかりませんでした</DialogStatusText>
        )}
      </DialogContent>
    </Dialog>
  );
}
