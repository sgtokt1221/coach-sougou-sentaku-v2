"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Video, ExternalLink, Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Session, SessionStatus } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";
import { useAuth } from "@/contexts/AuthContext";

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
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id, isCoach]);

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
