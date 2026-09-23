"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { LOGIC_DRILL_TYPE_LABELS } from "@/lib/types/logic-drill";
import type { LogicDrillListItem } from "@/app/api/admin/students/[id]/logic-drills/route";
import {
  DialogStatusText,
  useMarkViewedOnOpen,
  type DetailDialogProps,
} from "./shared";

const SCORE_LABELS: Record<string, string> = {
  consistency: "一貫性",
  validity: "妥当性",
  structure: "構成",
};

export function logicDrillTypeLabel(
  drillType: LogicDrillListItem["drillType"],
): string {
  if (!drillType) return "不明";
  return LOGIC_DRILL_TYPE_LABELS[drillType] ?? drillType;
}

export function logicDrillTotal(item: LogicDrillListItem): number {
  const s = item.scores;
  return (s?.consistency ?? 0) + (s?.validity ?? 0) + (s?.structure ?? 0);
}

export function logicDrillScoreColor(total: number): string {
  if (total >= 12) return "text-emerald-600";
  if (total >= 8) return "text-amber-600";
  return "text-rose-600";
}

/** 論理ドリル1件の詳細。一覧と同じ API（SWR のキャッシュ）から ID で探す */
export function LogicDrillDetailDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  const { data, isLoading, error } = useAuthSWR<LogicDrillListItem[]>(
    id ? `/api/admin/students/${studentId}/logic-drills` : null,
  );
  useMarkViewedOnOpen("logicDrill", id, studentId);
  const selectedDrill = id ? (data?.find((d) => d.id === id) ?? null) : null;

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selectedDrill
              ? logicDrillTypeLabel(selectedDrill.drillType)
              : "論理ドリル結果"}
          </DialogTitle>
        </DialogHeader>
        {selectedDrill ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {logicDrillTypeLabel(selectedDrill.drillType)}
              </Badge>
              <span
                className={`text-xl font-bold ${logicDrillScoreColor(logicDrillTotal(selectedDrill))}`}
              >
                {logicDrillTotal(selectedDrill)} / 15
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(selectedDrill.scores).map(([key, score]) => (
                <div key={key} className="text-center">
                  <div className="text-[10px] text-muted-foreground">{SCORE_LABELS[key] ?? key}</div>
                  <div className="text-sm font-bold">{score}</div>
                  <div className="mx-auto mt-0.5 flex gap-0.5 justify-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`size-1.5 rounded-full ${i <= score ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedDrill.feedback?.good && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">良かった点</p>
                <p className="text-sm leading-relaxed">{selectedDrill.feedback.good}</p>
              </div>
            )}

            {selectedDrill.feedback?.improve && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">改善点</p>
                <p className="text-sm leading-relaxed">{selectedDrill.feedback.improve}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(selectedDrill.completedAt).toLocaleString("ja-JP")}
            </p>
          </div>
        ) : id === null ? null : isLoading ? (
          <DialogStatusText>読み込み中…</DialogStatusText>
        ) : error ? (
          <DialogStatusText>論理ドリルの取得に失敗しました</DialogStatusText>
        ) : (
          <DialogStatusText>見つかりませんでした</DialogStatusText>
        )}
      </DialogContent>
    </Dialog>
  );
}
