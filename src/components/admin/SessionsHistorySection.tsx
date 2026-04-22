"use client";

import { useRouter } from "next/navigation";
import { Calendar, NotebookPen, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import type { Session, SessionType } from "@/lib/types/session";

const TYPE_LABEL: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  completed: "完了",
  cancelled: "キャンセル",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

interface Props {
  studentId: string;
}

export function SessionsHistorySection({ studentId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useAuthSWR<{ sessions: Session[] }>(
    `/api/admin/students/${studentId}/sessions?limit=10`,
  );
  const sessions = data?.sessions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4" />
          セッション履歴
          {sessions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {sessions.length} 件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            セッションがまだありません。
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const goal = s.prepPlan?.goal?.slice(0, 80);
              const firstNote = s.debrief?.notes?.split("\n")[0].slice(0, 80);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => router.push(`/admin/sessions/${s.id}`)}
                  className="w-full text-left rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {formatDate(s.scheduledAt)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABEL[s.type]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            s.status === "completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : s.status === "cancelled"
                                ? "border-muted-foreground/30 text-muted-foreground"
                                : ""
                          }`}
                        >
                          {STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                        {s.debrief?.newWeaknessAreas &&
                          s.debrief.newWeaknessAreas.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-rose-200 bg-rose-50 text-rose-700"
                            >
                              新弱点 {s.debrief.newWeaknessAreas.length}
                            </Badge>
                          )}
                      </div>
                      {goal && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <NotebookPen className="size-3 mt-0.5 shrink-0" />
                          <span className="truncate">{goal}</span>
                        </div>
                      )}
                      {firstNote && (
                        <div className="text-xs text-muted-foreground truncate">
                          気づき: {firstNote}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
