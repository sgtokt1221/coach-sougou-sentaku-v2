"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { effectiveCallStatus } from "@/lib/livekit/authz";
import type { Call } from "@/lib/types/call";

/**
 * そのセッションで今おこなわれている通話を返す。
 *
 * 生徒は通話を発信できないので、講師が始めた通話に入るための導線として使う。
 * 着信モーダルも出るが、あとから開いた場合はそちらが消えているため、
 * セッション画面にも「参加」を出せるようにする。
 *
 * sessionId での絞り込みはクライアント側で行う。Firestore で複合条件にすると
 * インデックスが1本増えるが、通話は同時に何本も走らないので取得件数は小さい。
 * 既存の participantUids + status + createdAt のインデックスをそのまま使う。
 */
export function useSessionCall(
  uid: string | null | undefined,
  sessionId: string | null | undefined
): Call | null {
  // 「どのセッションの分か」を添えて持つ。セッションを切り替えた直後に
  // 前の通話を出さないため。effect の中で同期に setState しない作りにしてある。
  const [state, setState] = useState<{
    sessionId: string;
    call: Call | null;
  } | null>(null);

  useEffect(() => {
    if (!uid || !sessionId || !db) return;
    const q = query(
      collection(db, "calls"),
      where("participantUids", "array-contains", uid),
      where("status", "in", ["ringing", "active"]),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const hit = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Call)
          .find(
            (c) =>
              c.sessionId === sessionId && effectiveCallStatus(c) !== "ended"
          );
        setState({ sessionId, call: hit ?? null });
      },
      (err) => {
        console.warn("[useSessionCall] subscribe failed", err);
        setState({ sessionId, call: null });
      }
    );
    return () => unsub();
  }, [uid, sessionId]);

  if (!uid || !sessionId) return null;
  return state?.sessionId === sessionId ? state.call : null;
}
