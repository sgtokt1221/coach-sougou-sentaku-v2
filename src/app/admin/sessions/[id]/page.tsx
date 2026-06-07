"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Video,
  Copy,
  ExternalLink,
  Check,
  Share2,
  XCircle,
  Save,
  User,
  AlertCircle,
  BarChart3,
  FileText,
  Loader2,
  Printer,
  Pencil,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/shared/AnimatedButton";
import { authFetch } from "@/lib/api/client";
import type { Session, SessionStatus, SessionType, SessionSubmission, GroupSessionFields } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";
import type { PracticeQuestion } from "@/lib/types/growth-report";

type GroupSession = Session & GroupSessionFields;
import type { StudentDetail } from "@/lib/types/admin";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";
import { LessonPrepSection } from "@/components/admin/LessonPrepSection";
import { PracticeQuestionsPanel } from "@/components/admin/PracticeQuestionsPanel";
import { LessonDebriefSection } from "@/components/admin/LessonDebriefSection";
import { SessionStudentDossier } from "@/components/admin/SessionStudentDossier";
import { SessionTranscriptCard } from "@/components/admin/SessionTranscriptCard";
import { PreviousSessionDebriefCard } from "@/components/admin/PreviousSessionDebriefCard";
import { SessionLifecycleBar } from "@/components/admin/SessionLifecycleBar";
import { SessionReportDialog } from "@/components/admin/SessionReportDialog";
import { AdminResearchSession } from "@/components/admin/AdminResearchSession";

const STATUS_VARIANT: Record<
  SessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function AdminSessionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pqEditing, setPqEditing] = useState(false);
  const [pqDraft, setPqDraft] = useState<PracticeQuestion[]>([]);
  const [pqSaving, setPqSaving] = useState(false);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState(false);
  const [skillCheck, setSkillCheck] = useState<SkillCheckStatus | null>(null);
  const [interviewSkillCheck, setInterviewSkillCheck] =
    useState<InterviewSkillCheckStatus | null>(null);

  // Group review submissions
  const [submissions, setSubmissions] = useState<SessionSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionUpdating, setSubmissionUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error();
      const data: Session = await res.json();
      setSession(data);
      setNotes(data.notes ?? "");
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Load submissions for group review sessions
  useEffect(() => {
    if (!session || session.type !== "group_review") return;

    setSubmissionsLoading(true);
    authFetch(`/api/sessions/${id}/submissions`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data: SessionSubmission[] = await res.json();
        setSubmissions(data);
      })
      .catch(() => {
        setSubmissions([]);
      })
      .finally(() => {
        setSubmissionsLoading(false);
      });
  }, [session, id]);

  useEffect(() => {
    const sid = session?.studentId;
    if (!sid || session?.type === "group_review") return;

    setStudentLoading(true);
    setStudentError(false);
    // 生徒詳細・スキルチェックをまとめて取得 (status に依らず常時表示)
    (async () => {
      try {
        const [detailRes, essaySkillRes, interviewSkillRes] = await Promise.all([
          authFetch(`/api/admin/students/${sid}`),
          authFetch(`/api/admin/students/${sid}/skill-check`),
          authFetch(`/api/admin/students/${sid}/interview-skill-check`),
        ]);
        if (!detailRes.ok) throw new Error();
        setStudent((await detailRes.json()) as StudentDetail);
        if (essaySkillRes.ok) setSkillCheck(await essaySkillRes.json());
        if (interviewSkillRes.ok)
          setInterviewSkillCheck(await interviewSkillRes.json());
      } catch {
        setStudentError(true);
      } finally {
        setStudentLoading(false);
      }
    })();
  }, [session?.studentId, session?.type]);

  async function patchSession(updates: Partial<Session>) {
    setSaving(true);
    try {
      const res = await authFetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      const data: Session = await res.json();
      setSession(data);
      setNotes(data.notes ?? "");
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function copyMeetLink() {
    if (!session?.meetLink) return;
    navigator.clipboard.writeText(session.meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startPqEdit() {
    setPqDraft(session?.practiceQuestions ?? []);
    setPqEditing(true);
  }

  async function savePracticeQuestions() {
    if (!session) return;
    setPqSaving(true);
    try {
      const res = await authFetch(`/api/admin/sessions/${id}/practice-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceQuestions: pqDraft }),
      });
      if (!res.ok) throw new Error("保存失敗");
      const { practiceQuestions } = (await res.json()) as {
        practiceQuestions: PracticeQuestion[];
      };
      setSession({ ...session, practiceQuestions });
      setPqEditing(false);
    } catch (err) {
      console.error("[session] save practice questions failed:", err);
      alert("類題の保存に失敗しました");
    } finally {
      setPqSaving(false);
    }
  }

  async function generateSummary() {
    if (!session) return;
    setIsGeneratingSummary(true);
    try {
      const res = await authFetch(`/api/sessions/${id}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: session.notes, type: session.type }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSession({ ...session, summary: data.summary });
    } catch {
      // silent
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  async function toggleSubmissionSelection(submissionId: string, selected: boolean) {
    setSubmissionUpdating(submissionId);
    try {
      const res = await authFetch(`/api/sessions/${id}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedByTeacher: selected }),
      });
      if (!res.ok) throw new Error();

      // Update local state
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, selectedByTeacher: selected }
            : sub
        )
      );
    } catch {
      // silent
    } finally {
      setSubmissionUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">セッションが見つかりません</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/admin/sessions")}
        >
          一覧に戻る
        </Button>
      </div>
    );
  }

  // 授業形態 (format 未設定の既存データは meetLink 有無でフォールバック判定)
  const isOnline = session.format
    ? session.format === "online"
    : !!session.meetLink;

  // 探究授業セッション（生徒が講師に教える回）は専用レイアウトにする
  const isResearchSession = !!session.isResearch && session.type !== "group_review";

  // 基本情報 + 操作 (1 対 1 は左カラム先頭、グループは単一カラム先頭で共用)
  const basicInfoCard = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">基本情報</CardTitle>
          <div className="flex items-center gap-1.5">
            {session.status === "cancelled" &&
              session.absenceReportedBy === "student" && (
                <span className="text-[11px] text-rose-600">生徒から連絡</span>
              )}
            <Badge variant={STATUS_VARIANT[session.status]}>
              {SESSION_STATUS_LABELS[session.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {session.type !== "group_review" && (
            <div>
              <span className="text-muted-foreground">生徒名:</span>{" "}
              <Link
                href={`/admin/students/${session.studentId}`}
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                {session.studentName}
              </Link>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">講師名:</span>{" "}
            <span className="font-medium">{session.teacherName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">タイプ:</span>{" "}
            {session.type === "group_review" ? (
              <Badge variant="outline" className="text-xs ml-1">
                {SESSION_TYPE_LABELS[session.type]}
              </Badge>
            ) : (
              <select
                className="ml-1 rounded-md border px-2 py-1 text-xs"
                value={session.type}
                onChange={(e) => patchSession({ type: e.target.value as SessionType })}
                disabled={saving}
              >
                {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][])
                  .filter(([t]) => t !== "group_review")
                  .map(([t, label]) => (
                    <option key={t} value={t}>
                      {label}
                    </option>
                  ))}
              </select>
            )}
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
          {session.type !== "group_review" && (
            <div>
              <span className="text-muted-foreground">形態:</span>{" "}
              <Badge
                variant="outline"
                className={`text-xs ml-1 ${
                  isOnline
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
                }`}
              >
                {isOnline ? "オンライン" : "対面"}
              </Badge>
            </div>
          )}

          {/* 探究授業フラグ (作成後も切替可) */}
          {session.type !== "group_review" && (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={!!session.isResearch}
                  onChange={(e) => patchSession({ isResearch: e.target.checked })}
                  disabled={saving}
                />
                <span className="text-muted-foreground">
                  探究授業セッション（生徒が講師に教える回）
                </span>
              </label>
            </div>
          )}

          {/* Group review specific fields */}
          {session.type === "group_review" && (
            <>
              {(session as GroupSession).theme && (
                <div>
                  <span className="text-muted-foreground">テーマ:</span>{" "}
                  <span className="font-medium">{(session as GroupSession).theme}</span>
                </div>
              )}
              {(session as GroupSession).targetWeakness && (
                <div>
                  <span className="text-muted-foreground">対象の弱点:</span>{" "}
                  <span className="font-medium">{(session as GroupSession).targetWeakness}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">提出期限:</span>{" "}
                <span className="font-medium">
                  {new Date((session as GroupSession).submissionDeadline).toLocaleString("ja-JP")}
                </span>
              </div>
            </>
          )}
        </div>

        {isOnline && session.meetLink && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Video className="size-4 text-emerald-600" />
              <span className="text-sm truncate flex-1">
                {session.meetLink}
              </span>
              <Button variant="ghost" size="sm" onClick={copyMeetLink}>
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
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

        {/* 操作 (旧「ステータス変更」を統合) */}
        <Separator />
        <div className="flex flex-wrap gap-2">
          {session.status === "scheduled" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => patchSession({ status: "cancelled" })}
              disabled={saving}
            >
              <XCircle className="size-4 mr-1" />
              欠席にする
            </Button>
          )}
          <Button
            size="sm"
            variant={session.sharedWithStudent ? "secondary" : "outline"}
            onClick={() =>
              patchSession({ sharedWithStudent: !session.sharedWithStudent })
            }
            disabled={saving}
          >
            <Share2 className="size-4 mr-1" />
            {session.sharedWithStudent ? "共有中" : "生徒に共有"}
          </Button>
          {session.type !== "group_review" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReportOpen(true)}
            >
              <BarChart3 className="size-4 mr-1" />
              成長レポート
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // メモ (1 対 1 は右カラム末尾、グループは単一カラム末尾で共用)
  const memoCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">メモ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="メモを入力..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <AnimatedButton
          size="sm"
          status={saving ? "loading" : saved ? "success" : "idle"}
          idleText="保存"
          idleIcon={<Save className="size-4" />}
          onStatusReset={() => setSaved(false)}
          onClick={() => {
            setSaved(false);
            patchSession({ notes }).then(() => setSaved(true));
          }}
          disabled={saving || notes === (session.notes ?? "")}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">セッション詳細</h1>
      </div>

      {isResearchSession ? (
        /* 探究授業: 専用レイアウト（基本情報＋講師録音・AI講評＋所見＋メモ） */
        <div className="space-y-6">
          {basicInfoCard}
          <AdminResearchSession
            sessionId={id}
            studentId={session.studentId}
            studentName={session.studentName}
            initialComment={session.researchTeacherComment}
            onSaveComment={(c) => patchSession({ researchTeacherComment: c })}
            savingComment={saving}
          />
          {memoCard}
        </div>
      ) : session.type !== "group_review" ? (
        /* 1 対 1: 2 カラム (左=参照 / 右=入力系) */
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* 左: 参照 (基本情報+操作 → 生徒情報) */}
          <div className="space-y-6">
            {basicInfoCard}
            {studentLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4" />
                    生徒情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-[280px] w-full" />
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ) : studentError || !student ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4" />
                    生徒情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                    <AlertCircle className="size-8" />
                    <p>生徒データの取得に失敗しました</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <SessionStudentDossier
                studentId={session.studentId}
                detail={student}
                skillCheck={skillCheck}
                interviewSkillCheck={interviewSkillCheck}
              />
            )}
          </div>
          {/* 右: 入力系 (録音 → 台本 → 振り返り → メモ) */}
          <div className="space-y-6">
            <SessionLifecycleBar
              sessionId={id}
              session={session}
              onSessionUpdate={(s) => setSession(s)}
            />
            <PreviousSessionDebriefCard sessionId={id} />
            <LessonPrepSection
              sessionId={id}
              initial={session.prepPlan}
              onChange={(plan) => setSession({ ...session, prepPlan: plan })}
              onPracticeQuestionsChange={(qs) =>
                setSession({ ...session, practiceQuestions: qs })
              }
            />
            {session.studentId && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-emerald-600" />
                    今日使う類題
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {!pqEditing && (session.practiceQuestions?.length ?? 0) > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startPqEdit}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-1 size-3" />
                          編集
                        </Button>
                        <Button asChild variant="outline" size="sm" className="cursor-pointer">
                          <Link
                            href={`/admin/sessions/${id}/practice-sheet?mode=both`}
                            target="_blank"
                          >
                            <Printer className="mr-1 size-3" />
                            問題用紙
                          </Link>
                        </Button>
                      </>
                    )}
                    {pqEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPqEditing(false)}
                          disabled={pqSaving}
                          className="cursor-pointer"
                        >
                          キャンセル
                        </Button>
                        <Button
                          size="sm"
                          onClick={savePracticeQuestions}
                          disabled={pqSaving}
                          className="cursor-pointer"
                        >
                          {pqSaving ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <Save className="mr-1 size-3" />
                          )}
                          保存
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <PracticeQuestionsPanel
                    questions={session.practiceQuestions ?? []}
                    studentId={session.studentId}
                    contextType="session"
                    contextId={id}
                    canAssign
                    editing={pqEditing}
                    value={pqDraft}
                    onChange={setPqDraft}
                  />
                </CardContent>
              </Card>
            )}
            <LessonDebriefSection
              sessionId={id}
              initial={session.debrief}
              existingWeaknessAreas={[]}
              onChange={(d) => setSession({ ...session, debrief: d })}
            />
            <SessionTranscriptCard transcript={session.lessonTranscript} />
            {memoCard}
          </div>
        </div>
      ) : (
        /* グループ添削: 1 カラム */
        <>
          {basicInfoCard}
          {/* Group Review Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">提出された小論文</CardTitle>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  まだ提出された小論文がありません
                </p>
                <p className="text-xs text-muted-foreground">
                  提出期限: {(session as GroupSession).submissionDeadline ?
                    new Date((session as GroupSession).submissionDeadline).toLocaleString("ja-JP") : "未設定"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2 border-b">
                  <span>総提出数: <strong className="text-foreground">{submissions.length}件</strong></span>
                  <span>選択済み: <strong className="text-foreground">{submissions.filter(s => s.selectedByTeacher).length}件</strong></span>
                  {(session as GroupSession).submissionDeadline && (
                    <span>期限: {new Date((session as GroupSession).submissionDeadline).toLocaleString("ja-JP")}</span>
                  )}
                </div>

                {/* Submissions List */}
                <div className="space-y-3">
                  {submissions
                    .sort((a, b) => b.voteCount - a.voteCount) // Sort by votes descending
                    .map((submission) => (
                    <div
                      key={submission.id}
                      className={`rounded-lg border p-4 ${
                        submission.selectedByTeacher
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {submission.anonymousLabel}
                            </Badge>
                            {submission.topic && (
                              <Badge variant="outline" className="text-xs">
                                {submission.topic}
                              </Badge>
                            )}
                          </div>

                          {submission.scores?.total && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">スコア:</span>
                              <span className={`font-medium ${scoreColor(submission.scores.total)}`}>
                                {submission.scores.total}/50
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>👍 {submission.voteCount} votes</span>
                            <span>{new Date(submission.createdAt).toLocaleDateString("ja-JP")}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={submission.selectedByTeacher ? "secondary" : "outline"}
                            onClick={() => toggleSubmissionSelection(
                              submission.id,
                              !submission.selectedByTeacher
                            )}
                            disabled={submissionUpdating === submission.id}
                          >
                            {submissionUpdating === submission.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : submission.selectedByTeacher ? (
                              <>
                                <Check className="size-4 mr-1" />
                                選択中
                              </>
                            ) : (
                              "取り上げる"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          {memoCard}
        </>
      )}

      {session.type !== "group_review" && session.studentId && (
        <SessionReportDialog
          studentId={session.studentId}
          sessionId={id}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}
