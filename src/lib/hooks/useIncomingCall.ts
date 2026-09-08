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
import { CALL_RING_TIMEOUT_SEC, type Call } from "@/lib/types/call";

/**
 * 自分あての着信を購読する。
 *
 * Firestore rules で participantUids に居る通話しか読めないので、
 * クエリの where と読み取り権限が一致している必要がある。
 * ここを変えるときは firestore.rules の calls も一緒に見ること。
 *
 * 複合インデックス（participantUids CONTAINS + status + createdAt DESC）が
 * 無いと結果が空になる沈黙失敗になる。firebase deploy --only firestore:indexes。
 */
export function useIncomingCall(uid: string | null | undefined): Call | null {
  const [call, setCall] = useState<Call | null>(null);

  useEffect(() => {
    if (!uid || !db) {
      setCall(null);
      return;
    }
    const q = query(
      collection(db, "calls"),
      where("participantUids", "array-contains", uid),
      where("status", "==", "ringing"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0];
        if (!doc) {
          setCall(null);
          return;
        }
        const next = { id: doc.id, ...doc.data() } as Call;
        // 発信した本人には着信を出さない
        if (next.hostUid === uid) {
          setCall(null);
          return;
        }
        // 一度断った通話は出し直さない
        if (next.declinedUids?.includes(uid)) {
          setCall(null);
          return;
        }
        // 放置されて残っている通話を鳴らさない
        if (effectiveCallStatus(next) === "ended") {
          setCall(null);
          return;
        }
        setCall(next);
      },
      (err) => {
        console.warn("[useIncomingCall] subscribe failed", err);
        setCall(null);
      }
    );
    return () => unsub();
  }, [uid]);

  // 60秒で自動的に引っ込める
  useEffect(() => {
    if (!call) return;
    const created = new Date(call.createdAt).getTime();
    const remainMs = created + CALL_RING_TIMEOUT_SEC * 1000 - Date.now();
    if (remainMs <= 0) {
      setCall(null);
      return;
    }
    const t = setTimeout(() => setCall(null), remainMs);
    return () => clearTimeout(t);
  }, [call]);

  return call;
}
