"use client";

import { useEffect, useState } from "react";
import { interviewAxisLayout, interviewAxisLabel } from "@/lib/interview/axis-layout";
import { interviewTotalMax, type InterviewScores } from "@/lib/types/interview";
import { rankFromTotal } from "@/lib/skill-check/rank";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ThumbsUp, Lightbulb, MessageSquare, Mic } from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface InterviewDetail {
  targetUniversity?: string;
  targetFaculty?: string;
  mode?: string;
  scores?: InterviewScores;
  feedback?: { overall: string; goodPoints: string[]; improvements: string[] };
  conversationSummary?: {
    keyWeaknesses: string[];
    strongPoints: string[];
    criticalMoments: string[];
    nextFocusAreas: string[];
  };
  messages?: { role: string; content: string }[];
}

const MODE_LABELS: Record<string, string> = {
  individual: "個人面接",
  group_discussion: "グループ討論",
  presentation: "プレゼン",
  oral_exam: "口頭試問",
};
/** 色はランク（割合）で決める。32/24 点の決め打ちは満点50の回で合わなかった */
function scoreColor(total: number, max: number): string {
  const rank = rankFromTotal(total, max);
  if (rank === "S" || rank === "A") return "text-emerald-600 dark:text-emerald-400";
  if (rank === "B" || rank === "C") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/**
 * セッション画面内で模擬面接結果を読み取り表示するダイアログ。
 */
export default function InterviewDetailDialog({
  studentId,
  interviewId,
  open,
  onOpenChange,
}: {
  studentId: string;
  interviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !interviewId) return;
    let active = true;
    setLoading(true);
    setData(null);
    authFetch(`/api/admin/students/${studentId}/interviews/${interviewId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, interviewId, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="size-5" />
            面接詳細
          </DialogTitle>
          {data && (
            <DialogDescription>
              {data.targetUniversity} {data.targetFaculty}
              {data.mode ? ` - ${MODE_LABELS[data.mode] ?? data.mode}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データの取得に失敗しました
          </p>
        ) : (
          <div className="space-y-6">
            {data.scores && (
              <div className="space-y-3">
                <p className="text-sm font-medium">スコア</p>
                <div className="space-y-2">
                  {interviewAxisLayout(data.mode, data.scores).map((axis) => (
                    <div key={axis.key} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-muted-foreground">{interviewAxisLabel(axis)}</span>
                      <Progress value={((data.scores![axis.key] ?? 0) / 10) * 100} className="h-2 flex-1" />
                      <span className="w-8 text-right text-sm font-medium">{data.scores![axis.key]}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-1">
                    <span className="text-sm font-medium">合計</span>
                    <span className={`text-lg font-bold ${scoreColor(data.scores.total, interviewTotalMax(data.scores))}`}>
                      {data.scores.total}/{interviewTotalMax(data.scores)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {data.feedback && (
              <div className="space-y-3">
                <p className="text-sm font-medium">フィードバック</p>
                <p className="text-sm text-muted-foreground">{data.feedback.overall}</p>
                {data.feedback.goodPoints?.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <ThumbsUp className="size-3" />良い点
                    </p>
                    <ul className="space-y-1 pl-4">
                      {data.feedback.goodPoints.map((p, i) => (
                        <li key={i} className="list-disc text-xs text-muted-foreground">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.feedback.improvements?.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Lightbulb className="size-3" />改善点
                    </p>
                    <ul className="space-y-1 pl-4">
                      {data.feedback.improvements.map((p, i) => (
                        <li key={i} className="list-disc text-xs text-muted-foreground">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {data.messages && data.messages.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <MessageSquare className="size-4" />会話ログ
                </p>
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                  {data.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "student"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
