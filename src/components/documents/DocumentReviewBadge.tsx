"use client";

import { CheckCircle2, RotateCcw, Clock } from "lucide-react";
import type { DocumentReviewState } from "@/lib/types/document";
import { DOCUMENT_REVIEW_LABELS } from "@/lib/types/document";

/** レビュー状態ごとの見た目（色・アイコン） */
const REVIEW_STYLE: Record<
  DocumentReviewState,
  { cls: string; Icon: typeof CheckCircle2 }
> = {
  approved: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  revision_requested: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    Icon: RotateCcw,
  },
  resubmitted: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Icon: Clock,
  },
};

/**
 * 出願書類の管理者レビュー状態バッジ（承認済み / 差し戻し(要修正) / 再確認待ち）。
 * state 未設定なら何も出さない。
 */
export function DocumentReviewBadge({
  state,
  className = "",
}: {
  state?: DocumentReviewState;
  className?: string;
}) {
  if (!state) return null;
  const { cls, Icon } = REVIEW_STYLE[state];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls} ${className}`}
    >
      <Icon className="size-3.5" />
      {DOCUMENT_REVIEW_LABELS[state]}
    </span>
  );
}
