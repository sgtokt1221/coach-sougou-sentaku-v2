"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  ArrowLeft,
  Video,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Share2,
  Play,
  Square,
  XCircle,
  Save,
  User,
  GraduationCap,
  School,
  TrendingUp,
  AlertCircle,
  BarChart3,
  FileText,
  Mic,
  Briefcase,
  StickyNote,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/shared/AnimatedButton";
import { authFetch } from "@/lib/api/client";
import type { Session, SessionStatus, SessionSubmission, GroupSessionFields } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";

type GroupSession = Session & GroupSessionFields;
import type { StudentDetail, ScoreTrendPoint } from "@/lib/types/admin";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";
import { CoachMemo } from "@/components/admin/CoachMemo";

const STATUS_VARIANT: Record<
  SessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

function weaknessBadge(w: WeaknessRecord) {
  const level = getWeaknessReminderLevel(w);
  switch (level) {
    case "critical":
      return <Badge variant="destructive">要注意</Badge>;
    case "warning":
      return (
        <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
          警告
        </Badge>
      );
    case "improving":
      return (
        <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
          改善中
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-green-400 bg-green-50 text-green-700">
          解決済み
        </Badge>
      );
    default:
      return <Badge variant="secondary">-</Badge>;
  }
}

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
  const [isCompleting, setIsCompleting] = useState(false);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState(false);

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
    if (!session?.studentId) return;
    const isActive = session.status === "scheduled" || session.status === "in_progress";
    if (!isActive) return;

    setStudentLoading(true);
    setStudentError(false);
    authFetch(`/api/admin/students/${session.studentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data: StudentDetail = await res.json();
        setStudent(data);
      })
      .catch(() => {
        setStudentError(true);
      })
      .finally(() => {
        setStudentLoading(false);
      });
  }, [session?.studentId, session?.status]);

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

  async function completeSession() {
    setIsCompleting(true);
    try {
      const res = await authFetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error();
      const data: Session = await res.json();
      setSession(data);
      setNotes(data.notes ?? "");
    } catch {
      // silent
    } finally {
      setIsCompleting(false);
    }
  }

  function copyMeetLink() {
    if (!session?.meetLink) return;
    navigator.clipboard.writeText(session.meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const showStudentPanel =
    session.status === "scheduled" || session.status === "in_progress";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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

          {session.meetLink && (
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
        </CardContent>
      </Card>

      {/* Status Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ステータス変更</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {session.status === "scheduled" && (
            <>
              <Button
                size="sm"
                onClick={() => patchSession({ status: "in_progress" })}
                disabled={saving}
              >
                <Play className="size-4 mr-1" />
                開始
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => patchSession({ status: "cancelled" })}
                disabled={saving}
              >
                <XCircle className="size-4 mr-1" />
                キャンセル
              </Button>
            </>
          )}
          {session.status === "in_progress" && (
            <Button
              size="sm"
              onClick={completeSession}
              disabled={saving || isCompleting}
            >
              {isCompleting ? (
                <>
                  <Sparkles className="size-4 mr-1 animate-spin" />
                  サマリー生成中...
                </>
              ) : (
                <>
                  <Square className="size-4 mr-1" />
                  完了
                </>
              )}
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
        </CardContent>
      </Card>

      {/* Notes */}
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

      {/* Student Info Panel - only for scheduled/in_progress */}
      {showStudentPanel && session.type !== "group_review" && (
        <StudentInfoPanel
          studentId={session.studentId}
          student={student}
          loading={studentLoading}
          error={studentError}
        />
      )}

      {/* Group Review Submissions */}
      {session.type === "group_review" && (
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
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          {session.summary ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">概要</p>
                <p>{session.summary.overview}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1">話題</p>
                <div className="flex flex-wrap gap-1">
                  {(session.summary.topicsDiscussed ?? []).map((t, i) => (
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
                    {(session.summary.strengths ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">改善点</p>
                  <ul className="list-disc list-inside space-y-1">
                    {(session.summary.improvements ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2">アクションアイテム</p>
                <div className="space-y-2">
                  {(session.summary.actionItems ?? []).map((item, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          const updated = [...(session.summary!.actionItems ?? [])];
                          updated[i] = { ...updated[i], completed: !updated[i].completed };
                          patchSession({
                            summary: { ...session.summary!, actionItems: updated },
                          });
                        }}
                        className="mt-1"
                      />
                      <div>
                        <p className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.task}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.assignee === "student" ? "生徒" : "講師"}
                          {item.deadline ? ` / 期限: ${item.deadline}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                サマリーはまだ生成されていません
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={isGeneratingSummary}
                onClick={generateSummary}
              >
                <Sparkles className="size-4 mr-1" />
                {isGeneratingSummary ? "生成中..." : "サマリーを生成"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentInfoPanel({
  studentId,
  student,
  loading,
  error,
}: {
  studentId: string;
  student: StudentDetail | null;
  loading: boolean;
  error: boolean;
}) {
  if (loading) {
    return (
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
    );
  }

  if (error || !student) {
    return (
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
    );
  }

  return (
    <StudentInfoPanelInner studentId={studentId} student={student} />
  );
}

function StudentInfoPanelInner({
  studentId,
  student,
}: {
  studentId: string;
  student: StudentDetail;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "essays-interviews" | "docs-activities" | "memos"
  >("overview");

  const { profile, weaknesses, essays, essayScoreTrend, interviewScoreTrend } = student;

  const essayChartData = (essayScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));
  const interviewChartData = (interviewScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            生徒情報: {profile.displayName}
          </CardTitle>
          <Link href={`/admin/students/${studentId}`}>
            <Button variant="outline" size="sm">
              詳細ページ
              <ExternalLink className="ml-1 size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SegmentControl
            value={activeTab}
            onChange={(v) => setActiveTab(v as typeof activeTab)}
            options={[
              { id: "overview", label: "概要" },
              { id: "essays-interviews", label: "添削・面接", accent: "violet" },
              { id: "docs-activities", label: "書類・活動", accent: "amber" },
              { id: "memos", label: "メモ", accent: "emerald" },
            ]}
            fullWidth
          />

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Profile summary */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                {profile.school && (
                  <div className="flex items-center gap-2">
                    <School className="size-4 text-muted-foreground" />
                    <span>{profile.school}</span>
                  </div>
                )}
                {profile.grade && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-muted-foreground" />
                    <span>{profile.grade}年生</span>
                  </div>
                )}
                <div className="flex items-start gap-2 sm:col-span-2">
                  <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {profile.targetUniversities.length > 0 ? (
                      profile.targetUniversities.map((u) => (
                        <Badge key={u} variant="outline" className="text-xs">
                          {u}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">志望校未設定</span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Score trend */}
              <div>
                <p className="flex items-center gap-2 text-sm font-medium mb-2">
                  <BarChart3 className="size-4" />
                  スコア推移
                </p>
                <ScoresTrendChart essayData={essayChartData} interviewData={interviewChartData} />
              </div>

              <Separator />

              {/* Weaknesses */}
              <div>
                <p className="text-sm font-medium mb-2">弱点一覧</p>
                {weaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    弱点データなし
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">弱点項目</th>
                          <th className="px-3 py-2 text-center font-medium">指摘回数</th>
                          <th className="px-3 py-2 text-center font-medium">ステータス</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weaknesses.map((w) => (
                          <tr key={w.area} className="border-b">
                            <td className="px-3 py-2">{w.area}</td>
                            <td className="px-3 py-2 text-center">{w.count}回</td>
                            <td className="px-3 py-2 text-center">{weaknessBadge(w)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Essays & Interviews Tab */}
          {activeTab === "essays-interviews" && (
            <div className="space-y-6">
              {/* Essays */}
              <div>
                <p className="flex items-center gap-2 text-sm font-medium mb-3">
                  <FileText className="size-4" />
                  添削履歴
                </p>
                {essays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    添削履歴なし
                  </p>
                ) : (
                  <div className="space-y-2">
                    {essays.map((essay) => (
                      <div
                        key={essay.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {essay.targetUniversity} {essay.targetFaculty}
                          </p>
                          {essay.topic && (
                            <p className="text-xs text-muted-foreground">{essay.topic}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(essay.submittedAt).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                        <div className="text-right">
                          {essay.scores ? (
                            <>
                              <p className={`text-lg font-bold ${scoreColor(essay.scores.total)}`}>
                                {essay.scores.total}
                              </p>
                              <p className="text-xs text-muted-foreground">/50</p>
                            </>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {essay.status === "uploaded" ? "OCR待ち" : essay.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Interviews */}
              <InterviewsSection studentId={studentId} />
            </div>
          )}

          {/* Documents & Activities Tab */}
          {activeTab === "docs-activities" && (
            <div className="space-y-6">
              <DocumentsSection studentId={studentId} />
              <ActivitiesSection studentId={studentId} />
            </div>
          )}

          {/* Memos Tab */}
          {activeTab === "memos" && <CoachMemo studentId={studentId} />}
        </div>
      </CardContent>
    </Card>
  );
}
