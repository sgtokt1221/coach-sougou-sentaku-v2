"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageTransition } from "@/components/shared/PageTransition";
import type { ChatAttachment } from "@/lib/types/feedback";

export default function StudentFeedbackPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { messages, loading } = useFeedbackThread(uid);
  const markedRef = useRef(false);

  // スレッド表示時に未読をクリア
  useEffect(() => {
    if (!uid || markedRef.current || loading) return;
    const hasUnread = messages.some((m) => m.senderRole === "coach" && !m.read);
    if (!hasUnread) return;
    markedRef.current = true;
    authFetch("/api/student/feedback/read", { method: "POST" }).catch(() => {});
  }, [uid, messages, loading]);

  async function handleSend(text: string, attachments: ChatAttachment[]) {
    const res = await authFetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, attachments }),
    });
    if (!res.ok) throw new Error("send failed");
  }

  return (
    <PageTransition>
      <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-9rem)]">
        <div className="flex items-center gap-2 pb-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">メッセージ</h1>
            <p className="text-xs text-muted-foreground">
              コーチとのやり取り
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border bg-card px-3">
          <ChatThread
            messages={messages}
            currentRole="student"
            onSend={handleSend}
            loading={loading}
            emptyText="コーチからのメッセージや、あなたからの相談がここに表示されます"
          />
        </div>
      </div>
    </PageTransition>
  );
}
