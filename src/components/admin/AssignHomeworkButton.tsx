"use client";

import { useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { HOMEWORK_STATUS_LABELS, type HomeworkAssignment } from "@/lib/types/homework";

/**
 * 類題カードに表示する「宿題として配布」ボタン。
 *
 * 配布済みなら「配布済 (取消)」、未配布なら「配布」を表示。
 * `status === "assigned"` のみ取消可能。submitted 以降は取消ボタンを表示しない。
 */
export function AssignHomeworkButton({
  studentId,
  reportId,
  practiceQuestionId,
  existing,
  onMutated,
  assignable = true,
}: {
  studentId: string;
  reportId: string;
  practiceQuestionId: string;
  /** 既存の配布レコード (この practiceQuestionId に紐づくもの)。なければ undefined */
  existing?: HomeworkAssignment;
  /** 配布 / 取消後に親コンポーネントへ通知 (SWR mutate 等) */
  onMutated?: () => void;
  /**
   * 宿題として配布可能か。 false なら「短答系のため配布不可」と表示してボタンを disable。
   * default true で後方互換 (homeworkAssignable === false の類題のみブロック)。
   */
  assignable?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const handleAssign = async () => {
    setBusy(true);
    try {
      // デフォルト締切: 1 週間後
      const due = new Date();
      due.setDate(due.getDate() + 7);

      const res = await authFetch(
        `/api/admin/reports/${studentId}/${reportId}/assign-homework`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practiceQuestionIds: [practiceQuestionId],
            dueDate: due.toISOString(),
          }),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "配布に失敗しました");
      }
      toast.success("宿題として配布しました (締切: 1 週間後)");
      onMutated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "配布に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      const res = await authFetch(
        `/api/admin/reports/${studentId}/${reportId}/assign-homework?practiceQuestionId=${encodeURIComponent(practiceQuestionId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "配布取消に失敗しました");
      }
      toast.success("配布を取消しました");
      onMutated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "配布取消に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (existing) {
    const canCancel = existing.status === "assigned";
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
          配布済 ({HOMEWORK_STATUS_LABELS[existing.status]})
        </Badge>
        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={busy}
            aria-label="配布を取消"
            title="未提出のうちは配布を取り消せます"
            className="size-7"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        )}
      </div>
    );
  }

  if (!assignable) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-7 px-2 text-[11px]"
        title="この類題は短答系のため、模擬面接 / 小論文として成立しません。 編集で「宿題として配布可」をオンにすると配布できます。"
      >
        配布不可
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAssign}
      disabled={busy}
      className="h-7 px-2 text-[11px]"
    >
      {busy ? (
        <Loader2 className="mr-1 size-3 animate-spin" />
      ) : (
        <Send className="mr-1 size-3" />
      )}
      宿題として配布
    </Button>
  );
}

