"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Call } from "@/lib/types/call";

/**
 * 通話ドキュメントを実時間で購読する。
 *
 * 録画の同意要求・録画中の表示・発信者による終了は、この購読で全員に伝わる。
 * 既存の授業録音が recordingState を onSnapshot で同期しているのと同じ形。
 *
 * Firestore rules で participantUids に居る人だけが読める。
 */
export function useCallRealtime(callId: string | null | undefined): {
  call: Call | null;
  /** 権限が無い、または通話が消えた */
  denied: boolean;
} {
  const [call, setCall] = useState<Call | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!callId || !db) return;
    const unsub = onSnapshot(
      doc(db, "calls", callId),
      (snap) => {
        if (!snap.exists()) {
          setDenied(true);
          return;
        }
        setCall({ id: snap.id, ...snap.data() } as Call);
      },
      (err) => {
        console.warn("[useCallRealtime] subscribe failed", err);
        setDenied(true);
      }
    );
    return () => unsub();
  }, [callId]);

  return { call, denied };
}
