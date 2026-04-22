"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Session } from "@/lib/types/session";

interface UseSessionRealtimeResult {
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Firestore の sessions/{id} ドキュメントを realtime 購読する。
 * client SDK なので Firestore rules で読み取り権限がある場合のみ動作する:
 *   - teacher: session.teacherId === auth.uid
 *   - student: session.studentId === auth.uid
 *   - superadmin: isSuperAdmin()
 */
export function useSessionRealtime(
  sessionId: string | null | undefined,
): UseSessionRealtimeResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const ref = doc(db, "sessions", sessionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setSession({ id: snap.id, ...snap.data() } as Session);
        } else {
          setSession(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useSessionRealtime] error:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [sessionId]);

  return { session, loading, error };
}
