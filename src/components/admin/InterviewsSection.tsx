"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, ChevronRight, ChevronDown } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { interviewTotalMax } from "@/lib/types/interview";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import type { InterviewMode, InterviewScores } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import {
  InterviewDetailDialog,
  interviewScoreColor,
} from "@/components/admin/detail-dialogs/InterviewDetailDialog";

interface InterviewListItem {
  id: string;
  mode: InterviewMode;
  targetUniversity: string;
  targetFaculty: string;
  scores: InterviewScores | null;
  feedbackSummary: string | null;
  createdAt: string;
  duration: number;
}

function modeBadge(mode: InterviewMode) {
  const colors: Record<InterviewMode, string> = {
    individual: "bg-sky-50 text-sky-700 border-sky-300",
    group_discussion: "bg-purple-50 text-purple-700 border-purple-300",
    presentation: "bg-amber-50 text-amber-700 border-amber-300",
    oral_exam: "bg-emerald-50 text-emerald-700 border-emerald-300",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[mode]}`}>
      {INTERVIEW_MODE_LABELS[mode]}
    </Badge>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s > 0 ? `${s}秒` : ""}`;
}

export function InterviewsSection({
  studentId,
  autoOpenInterviewId,
}: {
  studentId: string;
  autoOpenInterviewId?: string;
}) {
  const {
    data: interviews,
    isLoading,
    error,
  } = useAuthSWR<InterviewListItem[]>(
    `/api/admin/students/${studentId}/interviews`
  );

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = interviews ?? [];

  // deep-link: ?interview=[id] で該当面接の詳細を自動オープン（一度だけ）。
  // 一覧の読み込みを待ってから開く。描画中に state を合わせる形にして effect を使わない
  const [autoOpenedId, setAutoOpenedId] = useState<string | null>(null);
  if (autoOpenInterviewId && !isLoading && autoOpenedId !== autoOpenInterviewId) {
    setAutoOpenedId(autoOpenInterviewId);
    setOpen(true);
    setSelectedId(autoOpenInterviewId);
  }

  // Statistics
  const completedInterviews = items.filter((i) => i.scores);
  const totalCount = completedInterviews.length;
  const avgScore =
    totalCount > 0
      ? Math.round(
          completedInterviews.reduce(
            (sum, i) => sum + (i.scores?.total ?? 0),
            0
          ) / totalCount
        )
      : 0;

  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="size-4" />
              面接履歴
              {!isLoading && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {items.length}
                </Badge>
              )}
            </CardTitle>
            <ChevronDown
              className={`text-muted-foreground size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </CardHeader>
        {open && (
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <ApiErrorBanner
                error={error}
                title="面接履歴の取得に失敗しました"
              />
            ) : items.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                面接履歴データなし
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{totalCount}</p>
                    <p className="text-muted-foreground text-xs">面接回数</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p
                      className={`text-2xl font-bold ${interviewScoreColor(avgScore)}`}
                    >
                      {avgScore}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      平均スコア /40
                    </p>
                  </div>
                </div>

                {/* Interview List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">面接一覧</p>
                  {items.map((interview) => (
                    <div
                      key={interview.id}
                      className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                      onClick={() => setSelectedId(interview.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {interview.targetUniversity}{" "}
                            {interview.targetFaculty}
                          </span>
                          {modeBadge(interview.mode)}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                          <span>
                            {new Date(interview.createdAt).toLocaleDateString(
                              "ja-JP"
                            )}
                          </span>
                          <span>{formatDuration(interview.duration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {interview.scores ? (
                          <>
                            <SkillRankBadge
                              rank={scoreToSkillRank(
                                interview.scores.total,
                                interviewTotalMax(interview.scores)
                              )}
                              size="sm"
                              animate={false}
                            />
                            <span
                              className={`text-lg font-bold ${interviewScoreColor(interview.scores.total, interviewTotalMax(interview.scores))}`}
                            >
                              {interview.scores.total}
                            </span>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            進行中
                          </Badge>
                        )}
                        <ChevronRight className="text-muted-foreground size-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Interview Detail Dialog */}
      <InterviewDetailDialog
        studentId={studentId}
        id={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}
