"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { onForegroundMessage } from "@/lib/firebase/messaging";

/**
 * フォアグラウンド (タブが前面) で FCM 通知を受けた時に
 * sonner トーストを出し、メッセージ系 SWR を再検証する。
 * 背景通知は service worker が OS 通知を出すため、本コンポーネントは前面時の UX 向上用。
 */
export function ForegroundNotifier() {
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
