"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mic, ChevronRight, MessageSquare, ThumbsUp, Lightbulb } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, SCORE_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { InterviewMode, InterviewMessage, InterviewScores, InterviewFeedback } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";

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

interface InterviewDetail {
  id: string;
  mode: InterviewMode;
  targetUniversity: string;
  targetFaculty: string;
  messages: InterviewMessage[];
  scores: InterviewScores | null;
  feedback: InterviewFeedback | null;
  createdAt: string;
  duration: number;
}

const SCORE_LABELS: Record<string, string> = {
  clarity: "明確さ",
  apAlignment: "AP合致度",
  enthusiasm: "熱意",
  specificity: "具体性",
};

const INTERVIEW_SCORE_LINES = [
  { key: "total", label: "合計", color: CHART_COLORS.primary },
  { key: "clarity", label: "明確さ", color: SCORE_COLORS.structure },
  { key: "apAlignment", label: "AP合致度", color: SCORE_COLORS.apAlignment },
  { key: "enthusiasm", label: "熱意", color: SCORE_COLORS.logic },
  { key: "specificity", label: "具体性", color: SCORE_COLORS.expression },
] as const;

function modeBadge(mode: InterviewMode) {
  const colors: Record<InterviewMode, string> = {
    individual: "bg-blue-50 text-blue-700 border-blue-300",
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

function interviewScoreColor(total: number): string {
  if (total >= 32) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 24) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function InterviewsSection({ studentId }: { studentId: string }) {
  const { data: interviews, isLoading } = useAuthSWR<InterviewListItem[]>(
    `/api/admin/students/${studentId}/interviews`
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<InterviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllLines, setShowAllLines] = useState(false);

  const items = interviews ?? [];

  // Statistics
  const completedInterviews = items.filter((i) => i.scores);
  const totalCount = completedInterviews.length;
  const avgScore =
    totalCount > 0
      ? Math.round(completedInterviews.reduce((sum, i) => sum + (i.scores?.total ?? 0), 0) / totalCount)
      : 0;

  // Chart data
  const chartData = [...items]
    .filter((i) => i.scores)
    .reverse()
    .map((i) => ({
      date: i.createdAt.slice(5, 10).replace("-", "/"),
      total: i.scores!.total,
      clarity: i.scores!.clarity,
      apAlignment: i.scores!.apAlignment,
      enthusiasm: i.scores!.enthusiasm,
      specificity: i.scores!.specificity,
    }));

  const visibleLines = showAllLines ? INTERVIEW_SCORE_LINES : INTERVIEW_SCORE_LINES.slice(0, 1);

  async function openDetail(interviewId: string) {
    setSelectedId(interviewId);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/interviews/${interviewId}`
      );
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="size-4" />
            面接練習
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-[240px] w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              面接練習データなし
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">面接回数</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className={`text-2xl font-bold ${interviewScoreColor(avgScore)}`}>
                    {avgScore}
                  </p>
                  <p className="text-xs text-muted-foreground">平均スコア /40</p>
                </div>
              </div>

              {/* Score Trend */}
              {chartData.length >= 2 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">スコア推移</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllLines((v) => !v)}
                    >
                      {showAllLines ? "合計のみ" : "項目別も表示"}
                    </Button>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray={GRID_STYLE.strokeDasharray}
                        stroke={GRID_STYLE.stroke}
                        opacity={GRID_STYLE.opacity}
                      />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip content={<CustomTooltip />} />
                      {showAllLines && <Legend wrapperStyle={{ fontSize: 11 }} />}
                      {visibleLines.map((line) => (
                        <Line
                          key={line.key}
                          type="monotone"
                          dataKey={line.key}
                          name={line.label}
                          stroke={line.color}
                          strokeWidth={line.key === "total" ? 2 : 1.5}
                          dot={<CustomDot />}
                          activeDot={<CustomActiveDot />}
                          isAnimationActive={true}
                          animationDuration={CHART_ANIMATION.duration}
                          animationEasing={CHART_ANIMATION.easing}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Interview List */}
              <div className="space-y-2">
                <p className="text-sm font-medium">面接一覧</p>
                {items.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent cursor-pointer"
                    onClick={() => openDetail(interview.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {interview.targetUniversity} {interview.targetFaculty}
                        </span>
                        {modeBadge(interview.mode)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(interview.createdAt).toLocaleDateString("ja-JP")}</span>
                        <span>{formatDuration(interview.duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {interview.scores ? (
                        <span className={`text-lg font-bold ${interviewScoreColor(interview.scores.total)}`}>
                          {interview.scores.total}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">進行中</Badge>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Detail Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>面接詳細</DialogTitle>
            {detailData && (
              <DialogDescription>
                {detailData.targetUniversity} {detailData.targetFaculty} - {INTERVIEW_MODE_LABELS[detailData.mode]}
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
                    {(["clarity", "apAlignment", "enthusiasm", "specificity"] as const).map((key) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-muted-foreground">{SCORE_LABELS[key]}</span>
                        <Progress value={(detailData.scores![key] / 10) * 100} className="flex-1 h-2" />
                        <span className="w-8 text-right text-sm font-medium">{detailData.scores![key]}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-sm font-medium">合計</span>
                      <span className={`text-lg font-bold ${interviewScoreColor(detailData.scores.total)}`}>
                        {detailData.scores.total}/40
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {detailData.feedback && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">フィードバック</p>
                  <p className="text-sm text-muted-foreground">{detailData.feedback.overall}</p>

                  {detailData.feedback.goodPoints.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 mb-1">
                        <ThumbsUp className="size-3" />
                        良い点
                      </p>
                      <ul className="space-y-1">
                        {detailData.feedback.goodPoints.map((point, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:size-1.5 before:rounded-full before:bg-emerald-400">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detailData.feedback.improvements.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 text-xs font-medium text-amber-600 mb-1">
                        <Lightbulb className="size-3" />
                        改善点
                      </p>
                      <ul className="space-y-1">
                        {detailData.feedback.improvements.map((point, i) => (
                          <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:size-1.5 before:rounded-full before:bg-amber-400">
                            {point}
                          </li>
                        ))}
                      </ul>
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
                  <div className="space-y-3 max-h-80 overflow-y-auto rounded-lg border p-3 bg-muted/20">
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
                          <p className="text-[10px] font-medium mb-0.5 opacity-70">
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
            <div className="py-8 text-center text-sm text-muted-foreground">
              データの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
