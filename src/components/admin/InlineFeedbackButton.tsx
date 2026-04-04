"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import type { FeedbackType, AdminFeedback } from "@/lib/types/feedback";

interface InlineFeedbackButtonProps {
  studentId: string;
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  compact?: boolean;
}

export function InlineFeedbackButton({
  studentId,
  type,
  targetId,
  targetLabel,
  compact = false,
}: InlineFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingFeedbacks(true);
    authFetch(
      `/api/admin/students/${studentId}/feedback?type=${type}&targetId=${encodeURIComponent(targetId)}`
    )
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(Array.isArray(data) ? data : data.feedbacks ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFeedbacks(false));
  }, [open, studentId, type, targetId]);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, targetLabel, message: message.trim() }),
      });
      if (!res.ok) throw new Error("送信失敗");
      const created: AdminFeedback = await res.json();
      setFeedbacks((prev) => [created, ...prev]);
      setMessage("");
      toast.success("フィードバックを送信しました");
      setOpen(false);
    } catch {
      toast.error("フィードバックの送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={() => setOpen((v) => !v)}
        className={compact ? "size-7" : ""}
        title="フィードバック"
      >
        <MessageSquare className={compact ? "size-3.5" : "mr-1 size-3.5"} />
        {!compact && <span className="text-xs">FB</span>}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border bg-card p-3 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`${targetLabel} へのフィードバック...`}
                  rows={2}
                  className="min-h-[60px] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSend();
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Cmd+Enter で送信</span>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                >
                  {sending ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <Send className="mr-1 size-3" />
                  )}
                  送信
                </Button>
              </div>

              {/* Existing feedbacks */}
              {loadingFeedbacks ? (
                <p className="text-xs text-muted-foreground">読み込み中...</p>
              ) : feedbacks.length > 0 ? (
                <div className="space-y-2 border-t pt-2">
                  <p className="text-[10px] font-medium text-muted-foreground">過去のフィードバック</p>
                  {feedbacks.map((fb) => (
                    <div key={fb.id} className="rounded border bg-muted/30 p-2 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{fb.createdByName}</span>
                        <span className="text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{fb.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
