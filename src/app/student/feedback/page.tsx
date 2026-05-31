"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageTransition } from "@/components/shared/PageTransition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ChatAttachment } from "@/lib/types/feedback";
import type { StudentProfile } from "@/lib/types/user";

export default function StudentFeedbackPage() {
  const { user, userProfile } = useAuth();
  const uid = user?.uid;
  const assignedTeacherId = (userProfile as StudentProfile | null)
    ?.assignedTeacherId;
  const hasTeacher = Boolean(assignedTeacherId);

  return (
    <PageTransition>
      <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-9rem)]">
        <div className="flex items-center gap-2 pb-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">メッセージ</h1>
            <p className="text-xs text-muted-foreground">
              管理者・講師とのやり取り
            </p>
          </div>
        </div>

        {hasTeacher ? (
          <Tabs defaultValue="admin" className="min-h-0 flex-1">
            <TabsList>
              <TabsTrigger value="admin">管理者</TabsTrigger>
              <TabsTrigger value="teacher">講師</TabsTrigger>
            </TabsList>
            <TabsContent value="admin" className="min-h-0 flex-1">
              <AdminThread uid={uid} />
            </TabsContent>
            <TabsContent value="teacher" className="min-h-0 flex-1">
              <TeacherThread uid={uid} />
            </TabsContent>
          </Tabs>
        ) : (
          <AdminThread uid={uid} />
        )}
      </div>
    </PageTransition>
  );
}

/** 生徒↔管理者スレッド (既存・feedback サブコレクション) */
function AdminThread({ uid }: { uid?: string }) {
  const { messages, loading } = useFeedbackThread(uid);
  const markedRef = useRef(false);

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
    <div className="h-full overflow-hidden rounded-xl border bg-card px-3">
      <ChatThread
        messages={messages}
        currentRole="student"
        onSend={handleSend}
        loading={loading}
        emptyText="管理者からのメッセージや、あなたからの相談がここに表示されます"
      />
    </div>
  );
}

/** 生徒↔講師スレッド (新・teacherFeedback サブコレクション) */
function TeacherThread({ uid }: { uid?: string }) {
  const { messages, loading } = useFeedbackThread(uid, {
    subcollection: "teacherFeedback",
  });
  const markedRef = useRef(false);

  useEffect(() => {
    if (!uid || markedRef.current || loading) return;
    const hasUnread = messages.some((m) => m.senderRole === "coach" && !m.read);
    if (!hasUnread) return;
    markedRef.current = true;
    authFetch("/api/student/teacher-feedback/read", { method: "POST" }).catch(
      () => {}
    );
  }, [uid, messages, loading]);

  async function handleSend(text: string, attachments: ChatAttachment[]) {
    const res = await authFetch("/api/student/teacher-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, attachments }),
    });
    if (!res.ok) throw new Error("send failed");
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border bg-card px-3">
      <ChatThread
        messages={messages}
        currentRole="student"
        onSend={handleSend}
        loading={loading}
        emptyText="担当講師とのやり取りがここに表示されます"
      />
    </div>
  );
}
