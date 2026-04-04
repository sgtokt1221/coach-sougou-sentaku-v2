"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import type { AdminFeedback } from "@/lib/types/feedback";

interface CoachMemoProps {
  studentId: string;
}

export function CoachMemo({ studentId }: CoachMemoProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [memos, setMemos] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(
      `/api/admin/students/${studentId}/feedback?type=general&targetId=general`
    )
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setMemos(Array.isArray(data) ? data : data.feedbacks ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "general",
          targetId: "general",
          targetLabel: "全体メモ",
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("送信失敗");
      const created: AdminFeedback = await res.json();
      setMemos((prev) => [created, ...prev]);
      setMessage("");
      toast.success("メモを保存しました");
    } catch {
      toast.error("メモの保存に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="size-4" />
          コーチメモ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="この生徒に関するメモを入力..."
            rows={3}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Cmd+Enter で送信</span>
            <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Send className="mr-1 size-3" />
              )}
              保存
            </Button>
          </div>
        </div>

        {/* Memo list */}
        {loading ? (
          <p className="text-xs text-muted-foreground">読み込み中...</p>
        ) : memos.length > 0 ? (
          <div className="space-y-2 border-t pt-3">
            {memos.map((memo) => (
              <div key={memo.id} className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{memo.createdByName}</span>
                  <span className="text-muted-foreground">
                    {new Date(memo.createdAt).toLocaleDateString("ja-JP")}{" "}
                    {new Date(memo.createdAt).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">{memo.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-4">
            まだメモがありません
          </p>
        )}
      </CardContent>
    </Card>
  );
}
