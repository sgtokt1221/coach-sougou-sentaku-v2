"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, LineChart } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageTransition } from "@/components/shared/PageTransition";
import { FullHeightPage } from "@/components/layout/FullHeightPage";
import type {
  ChatAttachment,
  ChatQuote,
  ChatReference,
} from "@/lib/types/feedback";

export default function TeacherStudentChatPage() {
  return (
    <Suspense fallback={null}>
      <Body />
    </Suspense>
  );
}

function Body() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { user } = useAuth();
  const studentId = params?.id ?? "";
  const studentName = search.get("name") ?? "生徒";
  const teacherId = user?.uid;

  // 自分(講師)のスレッドのみ購読 (ルールの講師隔離を満たす)
  const { messages, loading } = useFeedbackThread(studentId, {
    subcollection: "teacherFeedback",
    teacherId,
  });
  const markedRef = useRef(false);

  // スレッド表示時に未読(生徒発言)をクリア
  useEffect(() => {
    if (!studentId || markedRef.current || loading) return;
    const hasUnread = messages.some(
      (m) => m.senderRole === "student" && !m.read
    );
    if (!hasUnread) return;
    markedRef.current = true;
    authFetch(`/api/teacher/students/${studentId}/feedback/read`, {
      method: "POST",
    }).catch(() => {});
  }, [studentId, messages, loading]);

  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    reference?: ChatReference,
    quote?: ChatQuote,
  ) {
    const res = await authFetch(`/api/teacher/students/${studentId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "general",
        targetId: "chat",
        targetLabel: "メッセージ",
        message: text,
        attachments,
        reference,
        quote,
      }),
    });
    if (!res.ok) throw new Error("send failed");
  }

  return (
    <PageTransition>
      <FullHeightPage>
        <div className="flex items-center gap-2 pb-2">
          <Link
            href="/teacher/students"
            className="rounded-md p-1 hover:bg-accent"
            aria-label="戻る"
          >
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{studentName} さん</h1>
            <p className="text-xs text-muted-foreground">担当生徒とのやり取り</p>
          </div>
          <Link
            href={`/admin/students/${studentId}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <LineChart className="size-4" />
            学習状況を見る
          </Link>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border bg-card px-3">
          <ChatThread
            messages={messages}
            currentRole="coach"
            onSend={handleSend}
            reactionTarget={{ ownerId: studentId }}
            viewerUid={user?.uid}
            loading={loading}
            otherName={studentName}
            referenceStudentId={studentId}
            emptyText="担当生徒とのメッセージがここに表示されます"
          />
        </div>
      </FullHeightPage>
    </PageTransition>
  );
}
