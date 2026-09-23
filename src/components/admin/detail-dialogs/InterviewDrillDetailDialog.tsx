"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import type { InterviewDrillListItem } from "@/app/api/admin/students/[id]/interview-drills/route";
import { DialogStatusText, type DetailDialogProps } from "./shared";

export function interviewDrillScoreColor(score: number): string {
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-rose-600";
}

/**
 * テーマ別ドリル演習1件の詳細。一覧と同じ API（SWR のキャッシュ）から ID で探す。
 * 未確認バッジの対象外なので「見た」印は付けない。
 */
export function InterviewDrillDetailDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  const { data, isLoading, error } = useAuthSWR<InterviewDrillListItem[]>(
    id ? `/api/admin/students/${studentId}/interview-drills` : null,
  );
  const selected = id ? (data?.find((d) => d.id === id) ?? null) : null;

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selected?.category ?? "テーマ別ドリル"}の結果
          </DialogTitle>
        </DialogHeader>
        {selected ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              {selected.category && <Badge variant="outline">{selected.category}</Badge>}
              <span className={`text-xl font-bold ${interviewDrillScoreColor(selected.score)}`}>
                {selected.score} / 5
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">質問</p>
              <p className="whitespace-pre-wrap">{selected.question}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">回答</p>
              <p className="whitespace-pre-wrap">{selected.answer}</p>
            </div>
            {selected.feedback && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">フィードバック</p>
                <p className="whitespace-pre-wrap leading-relaxed">{selected.feedback}</p>
              </div>
            )}
            {selected.betterAnswer && (
              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-xs font-medium text-muted-foreground">模範解答例</p>
                <p className="whitespace-pre-wrap leading-relaxed">{selected.betterAnswer}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(selected.createdAt).toLocaleString("ja-JP")}
            </p>
          </div>
        ) : id === null ? null : isLoading ? (
          <DialogStatusText>読み込み中…</DialogStatusText>
        ) : error ? (
          <DialogStatusText>テーマ別ドリル演習の取得に失敗しました</DialogStatusText>
        ) : (
          <DialogStatusText>見つかりませんでした</DialogStatusText>
        )}
      </DialogContent>
    </Dialog>
  );
}
