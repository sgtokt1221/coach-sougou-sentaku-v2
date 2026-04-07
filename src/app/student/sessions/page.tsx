"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Video, Lock, FileText, Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Session, SessionStatus } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";
import { useAuthSWR } from "@/lib/api/swr";
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

export default function StudentSessionsPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const isCoach = userProfile?.plan === "coach";
  const { data: rawData, isLoading: loading } = useAuthSWR<Session[] | { sessions: Session[] }>(isCoach ? "/api/sessions?sharedWithStudent=true" : null);
  const sessions = Array.isArray(rawData) ? rawData : (rawData as { sessions?: Session[] })?.sessions ?? [];

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Calendar className="size-5" />
        セッション一覧
      </h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="予定されたセッションはありません"
              description="講師がセッションを予約すると、ここに表示されます"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/student/sessions/${s.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {new Date(s.scheduledAt).toLocaleDateString("ja-JP")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {s.duration && (
                        <span className="text-xs text-muted-foreground">
                          ({s.duration}分)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm">{s.teacherName}</span>
                      <Badge variant="outline" className="text-xs">
                        {SESSION_TYPE_LABELS[s.type]}
                      </Badge>
                      <Badge
                        variant={STATUS_VARIANT[s.status]}
                        className="text-xs"
                      >
                        {SESSION_STATUS_LABELS[s.status]}
                      </Badge>
                      {s.type === "group_review" && (
                        <Badge variant="secondary" className="text-xs">
                          グループ添削
                        </Badge>
                      )}
                    </div>

                    {/* Group Review Additional Info */}
                    {s.type === "group_review" && (
                      <div className="mt-2 space-y-1">
                        {(s as any).theme && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="size-3" />
                            テーマ: {(s as any).theme}
                          </div>
                        )}
                        {(s as any).submissionDeadline && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            提出期限: {new Date((s as any).submissionDeadline).toLocaleDateString("ja-JP")}
                          </div>
                        )}
                        {/* TODO: Show submission status */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-green-600">提出済み</span> {/* This will be dynamic */}
                        </div>
                      </div>
                    )}
                  </div>
                  {s.meetLink && (
                    <Video className="size-5 text-emerald-600 shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
