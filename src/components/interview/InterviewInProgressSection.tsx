"use client";

import { useRouter } from "next/navigation";
import { Clock, Mic, MessageSquare, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
  INTERVIEW_MODE_LABELS,
  type InProgressInterview,
} from "@/lib/types/interview";

function formatDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 進行中（未完了）の面接一覧。履歴の先頭に表示し「続ける」で再開できる。
 * 0件なら何も描画しない。
 */
export function InterviewInProgressSection() {
  const router = useRouter();
  const { data, mutate } = useAuthSWR<{ inProgress: InProgressInterview[] }>(
    "/api/interview/in-progress"
  );
  const sessions = data?.inProgress ?? [];
  if (sessions.length === 0) return null;

  async function handleDiscard(id: string) {
    try {
      const res = await authFetch(`/api/interview/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("進行中の面接を破棄しました");
      mutate();
    } catch {
      toast.error("破棄に失敗しました");
    }
  }

  return (
    <div className="mb-2">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Clock className="size-4" />
        進行中の面接
      </h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Card key={s.id} className="border-amber-200 bg-amber-50/40">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {s.universityName} {s.facultyName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {INTERVIEW_MODE_LABELS[s.mode]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.inputMode === "voice" ? (
                      <>
                        <Mic className="mr-0.5 size-3" />
                        音声
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-0.5 size-3" />
                        テキスト
                      </>
                    )}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDateTime(s.lastActiveAt ?? s.startedAt)} • {s.messageCount} ターン
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => router.push(`/student/interview/session/${s.id}`)}
                >
                  <Play className="mr-1 size-3.5" />
                  続ける
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="破棄"
                  onClick={() => handleDiscard(s.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
