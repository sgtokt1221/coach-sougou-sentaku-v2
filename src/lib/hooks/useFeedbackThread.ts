"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { ChatMessage } from "@/lib/types/feedback";

interface UseFeedbackThreadResult {
  messages: ChatMessage[];
  loading: boolean;
  error: Error | null;
}

/**
 * users/{studentUid}/feedback を createdAt 昇順で realtime 購読し、
 * チャットメッセージ配列を返す。senderRole は createdBy から導出する
 * (createdBy === studentUid なら生徒、それ以外はコーチ。既存コメントは coach 扱い)。
 *
 * Firestore rules の canManageUser(studentUid) が読み取りを許可するため、
 * 生徒本人・担当コーチ・同 org・superadmin がそれぞれ購読できる。
 */
export function useFeedbackThread(
  studentUid: string | null | undefined
): UseFeedbackThreadResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(studentUid));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentUid || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "users", studentUid, "feedback"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ChatMessage[] = snap.docs.map((d) => {
          const data = d.data();
          const createdBy = (data.createdBy as string) ?? "";
          return {
            id: d.id,
            type: data.type ?? "general",
            targetId: data.targetId ?? "",
            targetLabel: data.targetLabel ?? "",
            message: data.message ?? "",
            createdBy,
            createdByName: data.createdByName ?? "",
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() ??
              (typeof data.createdAt === "string"
                ? data.createdAt
                : new Date().toISOString()),
            read: data.read ?? false,
            attachments: data.attachments ?? undefined,
            broadcast: data.broadcast ?? undefined,
            reference: data.reference ?? undefined,
            senderRole: createdBy === studentUid ? "student" : "coach",
          };
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.error("[useFeedbackThread] error:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [studentUid]);

  return { messages, loading, error };
}
