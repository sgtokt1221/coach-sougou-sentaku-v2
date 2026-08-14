"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { onForegroundMessage, refreshFcmToken } from "@/lib/firebase/messaging";
import { useAuth } from "@/contexts/AuthContext";

/**
 * フォアグラウンド (タブが前面) で FCM 通知を受けた時に
 * sonner トーストを出し、メッセージ系 SWR を再検証する。
 * 背景通知は service worker が OS 通知を出すため、本コンポーネントは前面時の UX 向上用。
 */
export function ForegroundNotifier() {
  const { user } = useAuth();

  /**
   * 許可済みの利用者のFCMトークンを、アプリを開くたびに取り直して保存する。
   * トークンは入れ替わるのに保存が「許可した瞬間」の1回だけだったため、
   * 入れ替わった端末には届かなくなっていた。
   * このコンポーネントは AppLayout 経由で全ページに常駐している。
   */
  useEffect(() => {
    if (!user) return;
    void user
      .getIdToken()
      .then((idToken) => refreshFcmToken(idToken))
      .catch(() => {
        // トークン更新の失敗で画面を壊さない（refreshFcmToken 側で warn 済み）
      });
  }, [user]);

  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      if (payload.title || payload.body) {
        toast(payload.title ?? "新着メッセージ", {
          description: payload.body,
        });
      }
      // 未読バッジ / インボックスを更新
      mutate("/api/student/feedback?countOnly=true");
      mutate("/api/admin/messages?countOnly=true");
      mutate("/api/admin/messages");
    });
    return () => {
      unsub?.();
    };
  }, []);

  return null;
}
