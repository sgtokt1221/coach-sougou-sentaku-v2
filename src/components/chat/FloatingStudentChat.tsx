"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import type { ChatAttachment, ChatReference } from "@/lib/types/feedback";

interface FloatingStudentChatProps {
  /** 対象生徒の uid */
  studentId: string;
  /** 対象生徒の表示名 */
  studentName: string;
  /** 対象生徒のプロフィール画像 URL */
  studentPhotoURL?: string | null;
  /** 閲覧者(コーチ側)のロール。スレッドと送信/既読 API を切り替える */
  viewerRole: "admin" | "superadmin" | "teacher";
  /** 閲覧者の uid。講師スレッドの teacherId に使用 */
  viewerUid: string;
}

/**
 * 生徒詳細画面の右下に常駐するフローティングチャット。
 * クリックで右下に大きめのカードを展開し、その生徒とのメッセージを全件閲覧・送受信できる。
 *
 * - 管理者/superadmin: users/{studentId}/feedback スレッド (管理者↔生徒)
 * - 講師: users/{studentId}/teacherFeedback で teacherId=自分 のスレッド (講師↔生徒)
 *
 * 送信 body は既存の講師チャットページと同形に揃え、URL のみ role で切り替える。
 */
export function FloatingStudentChat({
  studentId,
  studentName,
  studentPhotoURL,
  viewerRole,
  viewerUid,
}: FloatingStudentChatProps) {
  const isTeacher = viewerRole === "teacher";
  const { messages, loading } = useFeedbackThread(
    studentId,
    isTeacher
      ? { subcollection: "teacherFeedback", teacherId: viewerUid }
      : undefined,
  );

  const sendUrl = isTeacher
    ? `/api/teacher/students/${studentId}/feedback`
    : `/api/admin/students/${studentId}/feedback`;
  const readUrl = isTeacher
    ? `/api/teacher/students/${studentId}/feedback/read`
    : `/api/admin/students/${studentId}/feedback/read`;

  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const markedRef = useRef(false);

  // body 直下へポータルし、スクロールコンテナ(<main overflow-y-auto>)の影響を受けず
  // 常にビューポート右下に固定する (SSR では描画しない)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /** 未読 = 生徒発言で未読のもの */
  const unread = useMemo(
    () => messages.filter((m) => m.senderRole === "student" && !m.read).length,
    [messages],
  );

  // 開いている間に未読(生徒発言)を既読化 (1回だけ)
  useEffect(() => {
    if (!open || markedRef.current || loading || unread === 0) return;
    markedRef.current = true;
    authFetch(readUrl, { method: "POST" }).catch(() => {});
  }, [open, unread, loading, readUrl]);

  // 閉じたら既読フラグをリセット (次に開いたとき再度既読化できるように)
  useEffect(() => {
    if (!open) markedRef.current = false;
  }, [open]);

  /** 送信。既存チャットページと同じ body 形 (URL のみ role で切替) */
  async function handleSend(
    text: string,
    attachments: ChatAttachment[],
    reference?: ChatReference,
  ) {
    const res = await authFetch(sendUrl, {
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
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* 起動ボタン (FAB) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => setOpen(true)}
            aria-label={`${studentName} さんとのメッセージを開く`}
            // モバイルは下部ナビ(z-50)に隠れるため右上に表示。PC は従来どおり右下。
            className="fixed right-3 top-2 z-50 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:top-auto lg:bottom-6 lg:right-6 lg:size-14"
          >
            <MessageSquare className="size-6" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* 展開カード */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "bottom right" }}
            // モバイルは下部ナビ(z-50)を避けて上に持ち上げ、z-50 で前面に。PC は従来どおり右下。
            className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl right-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] h-[min(70vh,760px)] w-[calc(100vw-1.5rem)] lg:right-6 lg:bottom-6 lg:h-[min(78vh,760px)] lg:w-[min(640px,calc(100vw-2rem))]"
          >
            {/* ヘッダ */}
            <div className="flex items-center gap-2.5 border-b px-4 py-3">
              <Avatar size="sm">
                <AvatarImage src={studentPhotoURL ?? undefined} alt={studentName} />
                <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{studentName} さん</p>
                <p className="text-[11px] text-muted-foreground">
                  {isTeacher ? "担当生徒とのメッセージ" : "生徒とのメッセージ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 本文 */}
            <div className="min-h-0 flex-1 px-3">
              <ChatThread
                messages={messages}
                currentRole="coach"
                onSend={handleSend}
                loading={loading}
                otherName={studentName}
                otherPhotoURL={studentPhotoURL}
                referenceStudentId={studentId}
                emptyText="この生徒とのメッセージがここに表示されます"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
