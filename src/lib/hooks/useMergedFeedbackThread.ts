"use client";

import { useMemo } from "react";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import type { ChatMessage } from "@/lib/types/feedback";

/**
 * 生徒↔管理者 と 生徒↔講師 の2スレッドを1つの時系列にまとめて返す。
 *
 * 管理者の画面で使う。講師とのやり取りが別スレッドに隠れていると、管理者が
 * 「先生が何を言ったか」を見られない。保存先は分けたまま（講師同士が互いの
 * やり取りを読めない分離を残すため）、表示だけ1本にする。
 *
 * 講師スレッドのメッセージは teacherId を持つので、画面側はそれで区別できる。
 */
export function useMergedFeedbackThread(studentUid: string | null | undefined) {
  const admin = useFeedbackThread(studentUid);
  const teacher = useFeedbackThread(studentUid, {
    subcollection: "teacherFeedback",
  });

  const messages = useMemo<ChatMessage[]>(() => {
    return [...admin.messages, ...teacher.messages].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }, [admin.messages, teacher.messages]);

  return {
    messages,
    loading: admin.loading || teacher.loading,
    error: admin.error ?? teacher.error,
  };
}
