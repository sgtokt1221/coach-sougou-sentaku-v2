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
  Sparkles,
  Share2,
  Play,
  Square,
  XCircle,
  Save,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { Session, SessionStatus } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";

const STATUS_VARIANT: Record<
  SessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function AdminSessionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
              <span className="text-muted-foreground">生徒名:</span>{" "}
              <span className="font-medium">{session.studentName}</span>
            </div>
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
              onClick={() => patchSession({ status: "completed" })}
              disabled={saving}
            >
              <Square className="size-4 mr-1" />
              完了
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
          <Button
            size="sm"
            onClick={() => patchSession({ notes })}
            disabled={saving || notes === (session.notes ?? "")}
          >
            <Save className="size-4 mr-1" />
            保存
          </Button>
        </CardContent>
      </Card>

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
                    <label
                      key={i}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          const updated = [...session.summary!.actionItems];
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
