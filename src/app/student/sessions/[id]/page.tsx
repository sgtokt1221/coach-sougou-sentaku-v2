"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Video, ExternalLink, Lock, FileText, Clock, ThumbsUp, CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StudentRecordingController } from "@/components/student/StudentRecordingController";
import type { Session, SessionStatus, SessionSubmission } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

const STATUS_VARIANT: Record<
  SessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function StudentSessionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const isCoach = userProfile?.plan === "coach";
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SessionSubmission[]>([]);
  const [userEssays, setUserEssays] = useState<any[]>([]);
  const [selectedEssayId, setSelectedEssayId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [userSubmission, setUserSubmission] = useState<SessionSubmission | null>(null);
  const [votedSubmissions, setVotedSubmissions] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!isCoach) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error();
      const data: Session = await res.json();
      setSession(data);

      // For group_review sessions, load additional data
      if (data.type === "group_review") {
        await loadGroupReviewData();
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id, isCoach]);

  const loadGroupReviewData = useCallback(async () => {
    try {
      // Load user's essays for submission selection
      const essaysRes = await authFetch(`/api/essay/history?userId=${userProfile?.uid}`);
      if (essaysRes.ok) {
        const essaysData = await essaysRes.json();
        setUserEssays(essaysData.essays || []);
      }

      // Load existing submissions for voting
      const submissionsRes = await authFetch(`/api/sessions/${id}/submissions`);
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(submissionsData.submissions || []);

        // Check if current user has submitted
        const userSub = submissionsData.submissions.find((s: SessionSubmission) =>
          // For students, userId is stripped, so we need to check differently
          // For now, assume we get this info from a separate check
          false
        );
        setUserSubmission(userSub);
      }
    } catch (error) {
      console.error("Failed to load group review data:", error);
    }
  }, [id, userProfile?.uid]);

  const handleSubmitEssay = async () => {
    if (!selectedEssayId) return;

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/sessions/${id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essayId: selectedEssayId })
      });

      if (res.ok) {
        const newSubmission = await res.json();
        setUserSubmission(newSubmission);
        setSelectedEssayId("");
        // Reload submissions to get updated list
        await loadGroupReviewData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "提出に失敗しました");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("提出中にエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (votedSubmissions.has(submissionId)) return;

    try {
      const res = await authFetch(`/api/sessions/${id}/submissions/${submissionId}/vote`, {
        method: 'POST'
      });

      if (res.ok) {
        setVotedSubmissions(prev => new Set([...prev, submissionId]));
        // Update vote count locally
        setSubmissions(prev => prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, voteCount: sub.voteCount + 1 }
            : sub
        ));
      } else {
        const errorData = await res.json();
        alert(errorData.error || "投票に失敗しました");
      }
    } catch (error) {
      console.error("Vote error:", error);
      alert("投票中にエラーが発生しました");
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (!isCoach) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Lock}
              title="コーチプラン限定機能"
              description="面談記録はコーチプランでご利用いただけます"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 text-center">
        <p className="text-muted-foreground">セッションが見つかりません</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/student/sessions")}
        >
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <StudentRecordingController
        sessionId={id}
        teacherName={session.teacherName}
      />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">セッション詳細</h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">基本情報</CardTitle>
            <Badge variant={STATUS_VARIANT[session.status]}>
              {SESSION_STATUS_LABELS[session.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">講師名:</span>{" "}
              <span className="font-medium">{session.teacherName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">タイプ:</span>{" "}
              <Badge variant="outline" className="text-xs ml-1">
                {SESSION_TYPE_LABELS[session.type]}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">日時:</span>{" "}
              <span className="font-medium">
                {new Date(session.scheduledAt).toLocaleString("ja-JP")}
              </span>
            </div>
            {session.duration && (
              <div>
                <span className="text-muted-foreground">時間:</span>{" "}
                <span className="font-medium">{session.duration}分</span>
              </div>
            )}
          </div>

          {/* Group Review Additional Info */}
          {session.type === "group_review" && (
            <>
              <Separator />
              <div className="space-y-2">
                {(session as any).theme && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">テーマ:</span>
                    <span className="font-medium">{(session as any).theme}</span>
                  </div>
                )}
                {(session as any).submissionDeadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">提出期限:</span>
                    <span className="font-medium">
                      {new Date((session as any).submissionDeadline).toLocaleString("ja-JP")}
                    </span>
                  </div>
                )}
                {(session as any).targetWeakness && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">対象弱点:</span>
                    <Badge variant="outline">{(session as any).targetWeakness}</Badge>
                  </div>
                )}
              </div>
            </>
          )}

          {session.meetLink && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Video className="size-4 text-emerald-600" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(session.meetLink, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4 mr-1" />
                  Meetに参加
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Group Review Sections */}
      {session.type === "group_review" && (
        <>
          {/* Essay Submission Section */}
          {!userSubmission && new Date() < new Date((session as any).submissionDeadline) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">答案提出</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  添削済みの小論文から一つ選んで提出してください。提出された答案は匿名化され、他の参加者と一緒に検討されます。
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">提出する答案を選択</label>
                  <Select value={selectedEssayId} onValueChange={(v) => setSelectedEssayId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="答案を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {userEssays.map((essay) => (
                        <SelectItem key={essay.id} value={essay.id}>
                          {essay.topic} ({essay.universityName} - スコア: {essay.totalScore}点)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSubmitEssay}
                  disabled={!selectedEssayId || submitting}
                  className="w-full"
                >
                  {submitting ? "提出中..." : "この答案を提出する"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submission Status */}
          {userSubmission && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="size-5 text-emerald-600" />
                  提出完了
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">匿名ラベル: {userSubmission.anonymousLabel}</p>
                    <p className="text-sm text-muted-foreground">{userSubmission.topic}</p>
                  </div>
                  <Badge variant="default">提出済み</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anonymous Voting Section */}
          {submissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">答案に投票</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  解説してほしい答案に投票してください。投票数の多い答案が講師によって取り上げられます。
                </p>
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {submission.anonymousLabel}
                              </Badge>
                              {submission.selectedByTeacher && (
                                <Badge variant="default">取り上げ</Badge>
                              )}
                            </div>
                            {submission.topic && (
                              <p className="text-sm font-medium">{submission.topic}</p>
                            )}
                            {submission.scores && (
                              <p className="text-xs text-muted-foreground">
                                スコア: {submission.scores.total}点
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {submission.voteCount}票
                            </Badge>
                            <Button
                              size="sm"
                              variant={votedSubmissions.has(submission.id) ? "default" : "outline"}
                              onClick={() => handleVote(submission.id)}
                              disabled={votedSubmissions.has(submission.id)}
                            >
                              <ThumbsUp className="size-4 mr-1" />
                              {votedSubmissions.has(submission.id) ? "投票済み" : "解説してほしい"}
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {submission.ocrText.length > 200
                            ? submission.ocrText.substring(0, 200) + "..."
                            : submission.ocrText
                          }
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Summary */}
      {session.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">概要</p>
              <p>{session.summary.overview}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1">話題</p>
              <div className="flex flex-wrap gap-1">
                {session.summary.topicsDiscussed.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1">強み</p>
                <ul className="list-disc list-inside space-y-1">
                  {session.summary.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">改善点</p>
                <ul className="list-disc list-inside space-y-1">
                  {session.summary.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2">アクションアイテム</p>
              <div className="space-y-2">
                {session.summary.actionItems.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      item.assignee === "student"
                        ? "bg-primary/5 rounded-md p-2"
                        : "p-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="mt-1"
                    />
                    <div>
                      <p
                        className={
                          item.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }
                      >
                        {item.task}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.assignee === "student" ? "あなた" : "講師"}
                        {item.deadline ? ` / 期限: ${item.deadline}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
