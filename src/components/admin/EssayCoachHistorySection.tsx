"use client";

import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type {
  CoachThread,
  CoachThreadSummary,
} from "@/lib/types/essay-coach";

interface Props {
  studentId: string;
}

function formatDate(iso: string | undefined): string {
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

export function EssayCoachHistorySection({ studentId }: Props) {
  const { data, isLoading } = useAuthSWR<{ threads: CoachThreadSummary[] }>(
    `/api/admin/students/${studentId}/essay-coach-threads`
  );
  const [openThread, setOpenThread] = useState<CoachThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const threads = data?.threads ?? [];

  const openDetail = async (threadId: string) => {
    setLoadingThread(true);
    setOpenThread(null);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/essay-coach-threads/${threadId}`
      );
      if (!res.ok) throw new Error("取得失敗");
      const d = await res.json();
      setOpenThread(d.thread as CoachThread);
    } catch (err) {
      console.error(err);
      alert("スレッド詳細の取得に失敗しました");
    } finally {
      setLoadingThread(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          AIコーチ履歴
          {threads.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {threads.length} 件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            AIコーチとの対話履歴はまだありません。
          </p>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openDetail(t.id)}
                className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/40 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {t.topic || "(お題未設定)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.universityName && t.facultyName
                        ? `${t.universityName} ${t.facultyName}`
                        : "志望校未選択"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {formatDate(t.updatedAt)}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>対話 {t.messageCount} 往復</span>
                  <span>本文 {t.draftLength} 字</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={loadingThread || !!openThread}
        onOpenChange={(open) => {
          if (!open) {
            setOpenThread(null);
            setLoadingThread(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {loadingThread && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {openThread && (
            <>
              <DialogHeader>
                <DialogTitle>{openThread.topic || "(お題未設定)"}</DialogTitle>
                <DialogDescription>
                  {openThread.universityName && openThread.facultyName
                    ? `${openThread.universityName} ${openThread.facultyName} ・ `
                    : ""}
                  {formatDate(openThread.createdAt)} 開始 ・ 本文 {openThread.draftLength} 字
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {openThread.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-teal-500 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              {openThread.draftSnapshot && (
                <div className="border-t pt-3">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    本文スナップショット (先頭/末尾)
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs leading-relaxed max-h-40 overflow-y-auto">
                    {openThread.draftSnapshot}
                  </pre>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
