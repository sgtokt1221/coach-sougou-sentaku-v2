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
 *
 * 状態は「誰の分か」を添えて持つ。uid が変わった直後に前の人の着信を
 * 出さないため。effect の中で同期に setState しない作りにしてある。
 */
export function useIncomingCall(uid: string | null | undefined): Call | null {
  const [state, setState] = useState<{ uid: string; call: Call | null } | null>(
    null
  );
  // 時間切れになった通話のID。タイマーが立てる
  const [expiredId, setExpiredId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !db) return;
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
        const next = doc ? ({ id: doc.id, ...doc.data() } as Call) : null;
        const usable =
          next &&
          // 発信した本人には着信を出さない
          next.hostUid !== uid &&
          // 一度断った通話は出し直さない
          !next.declinedUids?.includes(uid) &&
          // 放置されて残っている通話を鳴らさない
          effectiveCallStatus(next) !== "ended"
            ? next
            : null;
        setState({ uid, call: usable });
      },
      (err) => {
        console.warn("[useIncomingCall] subscribe failed", err);
        setState({ uid, call: null });
      }
    );
    return () => unsub();
  }, [uid]);

  const call = uid && state?.uid === uid ? state.call : null;

  /**
   * 一定時間で鳴り止ませる。
   * 現在時刻を描画中に読まない（純粋でない処理は effect の中だけにする）。
   * 既に過ぎている場合も 0ms のタイマー経由にして、同期の状態更新を避ける。
   */
  useEffect(() => {
    if (!call) return;
    const remain =
      new Date(call.createdAt).getTime() +
      CALL_RING_TIMEOUT_SEC * 1000 -
      Date.now();
    const id = call.id;
    const t = setTimeout(() => setExpiredId(id), Math.max(0, remain));
    return () => clearTimeout(t);
  }, [call]);

  return call && expiredId !== call.id ? call : null;
}
