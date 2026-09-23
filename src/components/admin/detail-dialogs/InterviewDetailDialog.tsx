"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageSquare, ThumbsUp, Lightbulb } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { interviewTotalMax, INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import type {
  InterviewMode,
  InterviewMessage,
  InterviewScores,
  InterviewFeedback,
} from "@/lib/types/interview";
import type { DetailDialogProps } from "./shared";

interface ConversationSummary {
  keyWeaknesses: string[];
  strongPoints: string[];
  criticalMoments: string[];
  nextFocusAreas: string[];
}

interface InterviewDetail {
  id: string;
  mode: InterviewMode;
  targetUniversity: string;
  targetFaculty: string;
  messages: InterviewMessage[];
  scores: InterviewScores | null;
  feedback: InterviewFeedback | null;
  conversationSummary: ConversationSummary | null;
  createdAt: string;
  duration: number;
}

const SCORE_LABELS: Record<string, string> = {
  clarity: "明確さ",
  apAlignment: "AP合致度",
  enthusiasm: "熱意",
  specificity: "具体性",
};

/**
 * 満点はモードで変わる（口頭試問は専門知識を合計に入れるので50）。
 * 32/24 の絶対値で色を決めると、口頭試問だけ厳しく出る。割合で見る。
 */
export function interviewScoreColor(total: number, max = 40): string {
  const pct = max > 0 ? (total / max) * 100 : 0;
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/**
 * 模擬面接1件の詳細。開いたときに詳細 API から取る（一覧には会話ログが無い）。
 * 未確認バッジの対象外なので「見た」印は付けない。
 */
export function InterviewDetailDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  /** 取得した結果を ID ごと持つ。別の ID に切り替えた直後に前の中身を出さないため */
  const [result, setResult] = useState<{
    id: string;
    data: InterviewDetail | null;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      let data: InterviewDetail | null = null;
      try {
        const res = await authFetch(
          `/api/admin/students/${studentId}/interviews/${id}`
        );
        if (res.ok) data = await res.json();
      } catch {
        // ignore
      }
      if (!cancelled) setResult({ id, data });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, studentId]);

  // 閉じるアニメーションの間は直前の中身を残す
  const detailLoading = id !== null && result?.id !== id;
  const detailData = detailLoading ? null : (result?.data ?? null);

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="!top-[8vh] max-h-[84vh] !-translate-y-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>面接詳細</DialogTitle>
          {detailData && (
            <DialogDescription>
              {detailData.targetUniversity} {detailData.targetFaculty} -{" "}
              {INTERVIEW_MODE_LABELS[detailData.mode]}
            </DialogDescription>
          )}
        </DialogHeader>

        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            {/* Scores */}
            {detailData.scores && (
              <div className="space-y-3">
                <p className="text-sm font-medium">スコア</p>
                <div className="space-y-2">
                  {(
                    [
                      "clarity",
                      "apAlignment",
                      "enthusiasm",
                      "specificity",
                    ] as const
                  ).map((key) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-20 text-xs">
                        {SCORE_LABELS[key]}
                      </span>
                      <Progress
                        value={(detailData.scores![key] / 10) * 100}
                        className="h-2 flex-1"
                      />
                      <span className="w-8 text-right text-sm font-medium">
                        {detailData.scores![key]}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-1">
                    <span className="text-sm font-medium">合計</span>
                    <span
                      className={`text-lg font-bold ${interviewScoreColor(detailData.scores.total, interviewTotalMax(detailData.scores))}`}
                    >
                      {detailData.scores.total}/
                      {interviewTotalMax(detailData.scores)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback */}
            {detailData.feedback && (
              <div className="space-y-3">
                <p className="text-sm font-medium">フィードバック</p>
                <p className="text-muted-foreground text-sm">
                  {detailData.feedback.overall}
                </p>

                {detailData.feedback.goodPoints.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <ThumbsUp className="size-3" />
                      良い点
                    </p>
                    <ul className="space-y-1">
                      {detailData.feedback.goodPoints.map((point, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground relative pl-4 text-xs before:absolute before:top-1.5 before:left-1 before:size-1.5 before:rounded-full before:bg-emerald-400 before:content-['']"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detailData.feedback.improvements.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Lightbulb className="size-3" />
                      改善点
                    </p>
                    <ul className="space-y-1">
                      {detailData.feedback.improvements.map((point, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground relative pl-4 text-xs before:absolute before:top-1.5 before:left-1 before:size-1.5 before:rounded-full before:bg-amber-400 before:content-['']"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Summary */}
            {detailData.conversationSummary && (
              <div className="space-y-3">
                <p className="text-sm font-medium">弱点分析サマリー</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {detailData.conversationSummary.keyWeaknesses.length >
                    0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:bg-rose-950/20">
                      <p className="mb-2 text-xs font-medium text-rose-700 dark:text-rose-400">
                        主要弱点
                      </p>
                      <ul className="space-y-1">
                        {detailData.conversationSummary.keyWeaknesses.map(
                          (w, i) => (
                            <li
                              key={i}
                              className="text-xs text-rose-600 dark:text-rose-300"
                            >
                              {w}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                  {detailData.conversationSummary.strongPoints.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:bg-emerald-950/20">
                      <p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        強み
                      </p>
                      <ul className="space-y-1">
                        {detailData.conversationSummary.strongPoints.map(
                          (s, i) => (
                            <li
                              key={i}
                              className="text-xs text-emerald-600 dark:text-emerald-300"
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                {detailData.conversationSummary.criticalMoments.length >
                  0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/20">
                    <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      改善すべき回答
                    </p>
                    <ul className="space-y-1.5">
                      {detailData.conversationSummary.criticalMoments.map(
                        (c, i) => (
                          <li
                            key={i}
                            className="text-xs text-amber-700 dark:text-amber-300"
                          >
                            {c}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {detailData.conversationSummary.nextFocusAreas.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium">
                      次回の重点改善ポイント
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailData.conversationSummary.nextFocusAreas.map(
                        (a, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {a}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Log */}
            {detailData.messages.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <MessageSquare className="size-4" />
                  会話ログ
                </p>
                <div className="bg-muted/20 max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3">
                  {detailData.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "student"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        <p className="mb-0.5 text-[10px] font-medium opacity-70">
                          {msg.role === "ai" ? "面接官 (AI)" : "生徒"}
                        </p>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center text-sm">
            データの取得に失敗しました
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
