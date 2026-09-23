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
import { FACULTY_REGISTRY } from "@/data/faculty-topics/registry";
import type { SummaryDrillListItem } from "@/app/api/admin/students/[id]/summary-drills/route";
import {
  DialogStatusText,
  useMarkViewedOnOpen,
  type DetailDialogProps,
} from "./shared";

const SCORE_LABELS: Record<string, string> = {
  comprehension: "読解力",
  conciseness: "簡潔さ",
  keyPoints: "要点網羅",
  structure: "構成力",
  expression: "表現力",
};

export function getSummaryDrillFacultyLabel(facultyId: string | null): string {
  if (!facultyId) return "不明";
  return FACULTY_REGISTRY.find((f) => f.id === facultyId)?.label ?? facultyId;
}

export function summaryDrillScoreColor(total: number): string {
  if (total >= 20) return "text-emerald-600";
  if (total >= 15) return "text-amber-600";
  return "text-rose-600";
}

/** 要約ドリル1件の詳細。一覧と同じ API（SWR のキャッシュ）から ID で探す */
export function SummaryDrillDetailDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  // 範囲コメントの削除可否判定に使う
  const { user, userProfile } = useAuth();
  const { data, isLoading, error } = useAuthSWR<SummaryDrillListItem[]>(
    id ? `/api/admin/students/${studentId}/summary-drills` : null,
  );
  useMarkViewedOnOpen("summaryDrill", id, studentId);
  const selectedDrill = id ? (data?.find((d) => d.id === id) ?? null) : null;

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {selectedDrill?.passageTitle ?? "要約ドリル結果"}
          </DialogTitle>
        </DialogHeader>
        {selectedDrill ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {getSummaryDrillFacultyLabel(selectedDrill.facultyId)}
              </Badge>
              <span
                className={`text-xl font-bold ${summaryDrillScoreColor(selectedDrill.total)}`}
              >
                {selectedDrill.total} / 25
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Object.entries(selectedDrill.scores).map(([key, score]) => (
                <div key={key} className="text-center">
                  <div className="text-[10px] text-muted-foreground">{SCORE_LABELS[key]}</div>
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

            {selectedDrill.summaryText?.trim() && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  生徒の要約（ドラッグでコメント）
                </p>
                <InlineCommentableText
                  target="summaryDrill"
                  id={selectedDrill.id}
                  studentId={studentId}
                  text={selectedDrill.summaryText}
                  initialComments={selectedDrill.inlineComments}
                  mode="edit"
                  viewerUid={user?.uid}
                  viewerRole={userProfile?.role}
                />
              </div>
            )}

            {selectedDrill.feedback && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">講評</p>
                <p className="text-sm leading-relaxed">{selectedDrill.feedback}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(selectedDrill.completedAt).toLocaleString("ja-JP")}
            </p>
          </div>
        ) : id === null ? null : isLoading ? (
          <DialogStatusText>読み込み中…</DialogStatusText>
        ) : error ? (
          <DialogStatusText>要約ドリルの取得に失敗しました</DialogStatusText>
        ) : (
          <DialogStatusText>見つかりませんでした</DialogStatusText>
        )}
      </DialogContent>
    </Dialog>
  );
}
