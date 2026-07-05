"use client";

import { MessageSquare, CheckCircle2 } from "lucide-react";
import type { AdminFeedback } from "@/lib/types/feedback";
import type { StepApproval } from "@/lib/types/self-analysis";

interface SelfAnalysisCommentsProps {
  /** このステップ宛の管理者コメント */
  comments: AdminFeedback[];
  /** このステップの承認状態（あれば承認バッジを表示） */
  approval?: StepApproval;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 生徒の自己分析画面で、各ステップ直下に「コーチからのコメント」と承認バッジを常時表示する（読み取り専用）。
 */
export function SelfAnalysisComments({ comments, approval }: SelfAnalysisCommentsProps) {
  const approved = approval?.approved === true;
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (!approved && sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      {approved && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5" />
          コーチ承認済み
          {approval?.at && (
            <span className="font-normal text-emerald-600/80 dark:text-emerald-400/80">
              （{approval.byName || "コーチ"}・{formatWhen(approval.at)}）
            </span>
          )}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-primary/20 bg-primary/5 p-2.5"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <MessageSquare className="size-3.5" />
                コーチからのコメント
                <span className="ml-auto font-normal text-muted-foreground">
                  {c.createdByName ? `${c.createdByName}・` : ""}
                  {formatWhen(c.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                {c.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
