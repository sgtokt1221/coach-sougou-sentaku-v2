"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { FullHeightPage } from "@/components/layout/FullHeightPage";
import { PageTransition } from "@/components/shared/PageTransition";
import { SegmentControl } from "@/components/shared/SegmentControl";
import type {
  ChatAttachment,
  ChatQuote,
  ChatReference,
} from "@/lib/types/feedback";

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
  const teacherUnread = teacherList.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  const [tab, setTab] = useState<"admin" | "teacher">("admin");

  return (
    <PageTransition>
      <FullHeightPage>
        <div data-keyboard-hide className="flex shrink-0 items-center gap-2 pb-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">メッセージ</h1>
            <p className="text-xs text-muted-foreground">
              管理者・講師とのやり取り
            </p>
          </div>
        </div>

        {hasTeacher ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SegmentControl
              value={tab}
              onChange={(v) => setTab(v as "admin" | "teacher")}
              fullWidth
              options={[
                { id: "admin", label: "管理者" },
                {
                  id: "teacher",
                  label: "講師",
                  count: teacherUnread || undefined,
                },
              ]}
            />
            <div className="mt-3 min-h-0 flex-1">
              {tab === "admin" ? (
                <AdminThread uid={uid} />
              ) : (
                <TeacherTab uid={uid} teachers={teacherList} />
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <AdminThread uid={uid} />
          </div>
        )}
      </FullHeightPage>
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

  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    _reference?: ChatReference,
    quote?: ChatQuote,
  ) {
    const res = await authFetch("/api/student/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, attachments, quote }),
    });
    if (!res.ok) throw new Error("send failed");
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border bg-card px-3">
      <ChatThread
        messages={messages}
        currentRole="student"
        onSend={handleSend}
        reactionTarget={uid ? { ownerId: uid, collection: "feedback" } : undefined}
        viewerUid={uid}
        draftKey="student-feedback-admin"
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
          <TeacherThread
            uid={uid}
            teacherId={activeId}
            otherName={teachers.find((t) => t.teacherId === activeId)?.displayName}
            otherPhotoURL={
              teachers.find((t) => t.teacherId === activeId)?.photoURL ?? null
            }
          />
        </div>
      )}
    </div>
  );
}

/** 生徒↔特定講師のスレッド */
function TeacherThread({
  uid,
  teacherId,
  otherName,
  otherPhotoURL,
}: {
  uid?: string;
  teacherId: string;
  otherName?: string;
  otherPhotoURL?: string | null;
}) {
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

  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    _reference?: ChatReference,
    quote?: ChatQuote,
  ) {
    const res = await authFetch("/api/student/teacher-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, attachments, teacherId, quote }),
    });
    if (!res.ok) throw new Error("send failed");
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border bg-card px-3">
      <ChatThread
        messages={messages}
        currentRole="student"
        onSend={handleSend}
        reactionTarget={uid ? { ownerId: uid, collection: "teacherFeedback" } : undefined}
        viewerUid={uid}
        draftKey={`student-feedback-teacher-${teacherId}`}
        loading={loading}
        otherName={otherName}
        otherPhotoURL={otherPhotoURL}
        emptyText="担当講師とのやり取りがここに表示されます"
      />
    </div>
  );
}
