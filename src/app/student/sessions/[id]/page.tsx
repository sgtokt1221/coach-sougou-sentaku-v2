"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Video, ExternalLink, Lock, FileText, Clock, ThumbsUp, CheckCircle, CalendarX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { StudentRecordingController } from "@/components/student/StudentRecordingController";
import SessionArtifactsPanel from "@/components/sessions/SessionArtifactsPanel";
import { ResearchEvalView } from "@/components/research/ResearchEvalView";
import { StudentResearchDecide } from "@/components/research/StudentResearchDecide";
import { StudentResearchLiveInput } from "@/components/research/StudentResearchLiveInput";
import type { ResearchEvalResult } from "@/lib/ai/prompts/research";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
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
  ended: "secondary",
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
  const [absentOpen, setAbsentOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  // 探究セッションの講評（このセッションの最新分）と前回の「次回やること」
  const [researchCurrent, setResearchCurrent] = useState<{
    topic: string;
    feedback: ResearchEvalResult | null;
    nextItems: string[];
  } | null>(null);
  const [researchPrevNext, setResearchPrevNext] = useState<string[]>([]);
  const [researchUnit, setResearchUnit] = useState<ResearchCurriculumUnit | null>(null);
  const [researchActive, setResearchActive] = useState(false);

  async function reportAbsence() {
    setReporting(true);
    try {
      const res = await authFetch(`/api/sessions/${id}/absent`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "欠席連絡に失敗しました");
      }
      const updated: Session = await res.json();
      setSession(updated);
      setAbsentOpen(false);
      toast.success("欠席を連絡しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "欠席連絡に失敗しました");
    } finally {
      setReporting(false);
    }
  }

  async function restoreAttend() {
    setReporting(true);
    try {
      const res = await authFetch(`/api/sessions/${id}/attend`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "出席への変更に失敗しました");
      }
      const updated: Session = await res.json();
      setSession(updated);
      toast.success("出席に戻しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "出席への変更に失敗しました");
    } finally {
      setReporting(false);
    }
  }

  const load = useCallback(async () => {
    if (!isCoach) {
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error();
      const data: Session = await res.json();
      setSession(data);

      // For group_review sessions, load additional data
      if (data.type === "group_review") {
        await loadGroupReviewData();
      }

      // 探究セッション: このセッションの講評と前回の「次回やること」を取得
      if (data.isResearch && data.type !== "group_review") {
        try {
          const r = await authFetch(`/api/research/sessions`);
          if (r.ok) {
            const list = (await r.json()) as Array<{
              topic: string;
              feedback: ResearchEvalResult | null;
              nextItems: string[];
              sessionId: string | null;
            }>;
            const cur = list.find((x) => x.sessionId === id) ?? null;
            setResearchCurrent(
              cur ? { topic: cur.topic, feedback: cur.feedback, nextItems: cur.nextItems } : null
            );
            const prev = list.find((x) => x.sessionId !== id);
            setResearchPrevNext(prev?.nextItems ?? []);
          }
          // カリキュラムの今回ユニット（当該セッション紐付け or 最初の未完了）
          const cr = await authFetch(`/api/research/curriculum`);
          if (cr.ok) {
            const cur = (await cr.json()) as ResearchCurriculum | null;
            setResearchActive(cur?.status === "active");
            if (cur?.units) {
              const unit =
                cur.units.find((u) => u.sessionId === id) ??
                cur.units.find((u) => u.status !== "done") ??
                null;
              setResearchUnit(unit);
            }
          }
        } catch {
          /* noop */
        }
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
      {/* 探究セッションは講師がその場で録音するため、生徒側の録音は出さない */}
      {!session.isResearch && (
        <StudentRecordingController
          sessionId={id}
          teacherName={session.teacherName}
        />
      )}

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
            <div className="flex items-center gap-2">
              {session.isResearch && (
                <Badge className="border-teal-400 bg-teal-50 text-teal-700">
                  探究
                </Badge>
              )}
              <Badge variant={STATUS_VARIANT[session.status]}>
                {SESSION_STATUS_LABELS[session.status]}
              </Badge>
            </div>
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

          {/* 欠席連絡 (1 対 1・予定・未来のみ) */}
          {session.type !== "group_review" && (
            <>
              <Separator />
              {session.status === "cancelled" ? (
                session.absenceReportedBy === "student" ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">欠席連絡済みです</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={restoreAttend}
                      disabled={reporting}
                    >
                      {reporting ? (
                        <Loader2 className="size-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="size-4 mr-1" />
                      )}
                      出席に戻す
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">欠席（教室で登録）</p>
                )
              ) : session.status === "scheduled" &&
                new Date(session.scheduledAt) > new Date() ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => setAbsentOpen(true)}
                >
                  <CalendarX className="size-4 mr-1" />
                  欠席連絡
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* 探究授業セッション: カリキュラム未作成なら分野決め問答、作成済みなら閲覧ビュー */}
      {session.isResearch && session.type !== "group_review" && (
        researchActive ? (
        <div className="space-y-4">
          <StudentResearchLiveInput
            sessionId={id}
            studentUid={session.studentId}
            initial={session.researchInputs}
          />
          {researchUnit && (
            <Card className="border-teal-200 bg-teal-50/40">
              <CardHeader>
                <CardTitle className="text-base">
                  今回のテーマ（第{researchUnit.order}回）: {researchUnit.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">狙い:</span> {researchUnit.aim}
                </p>
                {researchUnit.research.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">調べてくること:</span>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {researchUnit.research.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p>
                  <span className="text-muted-foreground">教えるアウトプット:</span> {researchUnit.output}
                </p>
              </CardContent>
            </Card>
          )}

          {researchPrevNext.length > 0 && (
            <Card className="border-sky-200 bg-sky-50/60">
              <CardHeader>
                <CardTitle className="text-base">今回の準備（前回の「次回やること」）</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {researchPrevNext.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {researchCurrent?.feedback ? (
            <ResearchEvalView feedback={researchCurrent.feedback} topic={researchCurrent.topic} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                この回の講評はまだありません。授業で先生が発表を記録すると、ここに表示されます。
              </CardContent>
            </Card>
          )}

          {session.researchTeacherComment && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">先生からのコメント</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {session.researchTeacherComment}
              </CardContent>
            </Card>
          )}
        </div>
        ) : (
          <StudentResearchDecide />
        )
      )}

      {/* 欠席連絡 確認ダイアログ */}
      <Dialog open={absentOpen} onOpenChange={setAbsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>欠席を連絡しますか？</DialogTitle>
            <DialogDescription>
              {new Date(session.scheduledAt).toLocaleString("ja-JP")} のセッションを欠席として連絡します。担当の先生に通知されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsentOpen(false)} disabled={reporting}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={reportAbsence}
              disabled={reporting}
            >
              {reporting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <CalendarX className="size-4 mr-1" />
              )}
              欠席を連絡する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 前回〜今回の取り組み（通常コーチングセッションのみ。探究・グループは出さない） */}
      {session.type !== "group_review" && !session.isResearch && (
        <SessionArtifactsPanel
          endpoint={`/api/student/sessions/${id}/artifacts`}
          studentView
        />
      )}

      {/* Summary (講師が共有した指導報告書のみ表示) */}
      {session.summary && session.sharedWithStudent && (
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
