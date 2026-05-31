"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageTransition } from "@/components/shared/PageTransition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ChatAttachment } from "@/lib/types/feedback";

interface StudentTeacherItem {
  teacherId: string;
  displayName: string;
  photoURL?: string | null;
  unread: number;
}

export default function StudentFeedbackPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: teachers } = useAuthSWR<StudentTeacherItem[]>(
    "/api/student/teachers"
  );
  const teacherList = teachers ?? [];
  const hasTeacher = teacherList.length > 0;

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
              <TeacherTab uid={uid} teachers={teacherList} />
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

/** 講師タブ: 複数講師なら講師セレクタで切替、各講師と別スレッド */
function TeacherTab({
  uid,
  teachers,
}: {
  uid?: string;
  teachers: StudentTeacherItem[];
}) {
  const [selected, setSelected] = useState(teachers[0]?.teacherId ?? "");
  const activeId = teachers.some((t) => t.teacherId === selected)
    ? selected
    : teachers[0]?.teacherId ?? "";

  return (
    <div className="flex h-full flex-col gap-2">
      {teachers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {teachers.map((t) => (
            <button
              key={t.teacherId}
              type="button"
              onClick={() => setSelected(t.teacherId)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                t.teacherId === activeId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {t.displayName}
              {t.unread > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {activeId && (
        <div className="min-h-0 flex-1">
          <TeacherThread uid={uid} teacherId={activeId} />
        </div>
      )}
    </div>
  );
}

/** 生徒↔特定講師のスレッド */
function TeacherThread({ uid, teacherId }: { uid?: string; teacherId: string }) {
  const { messages, loading } = useFeedbackThread(uid, {
    subcollection: "teacherFeedback",
    teacherId,
  });
  const markedRef = useRef(false);

  // teacherId 切替時に既読フラグをリセット
  useEffect(() => {
    markedRef.current = false;
  }, [teacherId]);

  useEffect(() => {
    if (!uid || markedRef.current || loading) return;
    const hasUnread = messages.some((m) => m.senderRole === "coach" && !m.read);
    if (!hasUnread) return;
    markedRef.current = true;
    authFetch("/api/student/teacher-feedback/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    }).catch(() => {});
  }, [uid, teacherId, messages, loading]);

  async function handleSend(text: string, attachments: ChatAttachment[]) {
    const res = await authFetch("/api/student/teacher-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, attachments, teacherId }),
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
