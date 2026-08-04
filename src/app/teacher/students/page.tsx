"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { PageTransition } from "@/components/shared/PageTransition";
import { FullHeightPage } from "@/components/layout/FullHeightPage";
import { getInitials } from "@/lib/utils/avatar";
import type {
  ChatAttachment,
  ChatQuote,
  ChatReference,
} from "@/lib/types/feedback";

interface TeacherStudentItem {
  studentId: string;
  studentName: string;
  studentPhotoURL?: string | null;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadByTeacher: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 講師のメッセージ画面。SegmentControl で「担当生徒」と「管理者に連絡」を
 * 1 画面で切り替える（旧 /teacher/messages を統合）。
 */
export default function TeacherMessagesPage() {
  const [tab, setTab] = useState<"students" | "admin">("students");
  const { data: students } = useAuthSWR<TeacherStudentItem[]>(
    "/api/teacher/students"
  );
  const studentUnread = (students ?? []).reduce(
    (sum, s) => sum + (s.unreadByTeacher ?? 0),
    0
  );

  return (
    <PageTransition>
      <FullHeightPage className="mx-auto w-full max-w-2xl p-3 lg:p-6">
        <div data-keyboard-hide className="mb-3 flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">メッセージ</h1>
        </div>

        <SegmentControl
          value={tab}
          onChange={(v) => setTab(v as "students" | "admin")}
          fullWidth
          options={[
            { id: "students", label: "担当生徒", count: studentUnread || undefined },
            { id: "admin", label: "管理者に連絡" },
          ]}
        />

        <div className="mt-3 min-h-0 flex-1">
          {tab === "students" ? (
            <StudentsInbox students={students} />
          ) : (
            <AdminContact />
          )}
        </div>
      </FullHeightPage>
    </PageTransition>
  );
}

/** 担当生徒インボックス (一覧 → 各生徒チャット) */
function StudentsInbox({ students }: { students?: TeacherStudentItem[] }) {
  if (!students) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            担当生徒がまだ割り当てられていません。
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2 overflow-y-auto">
      {students.map((s) => (
        <Link
          key={s.studentId}
          href={`/teacher/students/${s.studentId}?name=${encodeURIComponent(s.studentName)}`}
          className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
        >
          <Avatar size="default" className="shrink-0">
            <AvatarImage src={s.studentPhotoURL ?? undefined} alt={s.studentName} />
            <AvatarFallback>{getInitials(s.studentName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{s.studentName}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatTime(s.lastMessageAt)}
              </span>
            </div>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MessageSquare className="size-3 shrink-0" />
              {s.lastMessageText || "メッセージはまだありません"}
            </p>
          </div>
          {s.unreadByTeacher > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {s.unreadByTeacher}
            </span>
          )}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

/** 管理者(担当admin)との 1:1 チャット (旧 /teacher/messages) */
function AdminContact() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { messages, loading } = useFeedbackThread(uid);
  const markedRef = useRef(false);

  useEffect(() => {
    if (!uid || markedRef.current || loading) return;
    const hasUnread = messages.some((m) => m.senderRole === "coach" && !m.read);
    if (!hasUnread) return;
    markedRef.current = true;
    authFetch("/api/teacher/feedback/read", { method: "POST" }).catch(() => {});
  }, [uid, messages, loading]);

  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    _reference?: ChatReference,
    quote?: ChatQuote,
  ) {
    const res = await authFetch("/api/teacher/feedback", {
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
        reactionTarget={uid ? { ownerId: uid } : undefined}
        viewerUid={uid}
        loading={loading}
        emptyText="担当管理者へのメッセージがここに表示されます"
      />
    </div>
  );
}
