"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { mutate } from "swr";
import { ArrowLeft } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import type {
  ChatAttachment,
  ChatReference,
  ConversationListItem,
} from "@/lib/types/feedback";

export default function AdminThreadPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const router = useRouter();
  const { messages, loading } = useFeedbackThread(studentId);
  const { data: list } = useAuthSWR<ConversationListItem[]>(
    "/api/admin/messages"
  );
  const readRef = useRef(false);

  const item = list?.find((s) => s.studentId === studentId);
  const studentName = item?.studentName ?? "生徒";
  const studentPhotoURL = item?.studentPhotoURL ?? null;

  // スレッドを開いたら未読をクリア
  useEffect(() => {
    if (!studentId || readRef.current || loading) return;
    readRef.current = true;
    authFetch(`/api/admin/students/${studentId}/feedback/read`, {
      method: "POST",
    })
      .then(() => mutate("/api/admin/messages"))
      .catch(() => {});
  }, [studentId, loading]);

  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    reference?: ChatReference
  ) {
    const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "general",
        targetId: "chat",
        targetLabel: "メッセージ",
        message: text,
        attachments,
        reference,
      }),
    });
    if (!res.ok) throw new Error("send failed");
    mutate("/api/admin/messages");
  }

  return (
    <PageTransition>
      <div className="flex h-[calc(var(--vvh,100dvh)-7rem)] flex-col lg:h-[calc(100dvh-9rem)]">
        <div className="flex items-center gap-2 pb-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/admin/messages")}
            aria-label="戻る"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Avatar size="default" className="shrink-0">
            <AvatarImage src={studentPhotoURL ?? undefined} alt={studentName} />
            <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-base font-bold">{studentName}</h1>
            <p className="text-[11px] text-muted-foreground">メッセージ</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border bg-card px-3">
          <ChatThread
            messages={messages}
            currentRole="coach"
            onSend={handleSend}
            loading={loading}
            otherName={studentName}
            otherPhotoURL={studentPhotoURL}
            referenceStudentId={item?.role === "teacher" ? undefined : studentId}
            emptyText="この生徒へのメッセージやコメントがここに表示されます"
          />
        </div>
      </div>
    </PageTransition>
  );
}
