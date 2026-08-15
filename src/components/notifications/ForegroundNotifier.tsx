"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { onForegroundMessage, refreshFcmToken } from "@/lib/firebase/messaging";
import { useAuth } from "@/contexts/AuthContext";

/**
 * フォアグラウンド (タブが前面) で FCM 通知を受けた時に
 * sonner トーストを出し、メッセージ系 SWR を再検証する。
 * 背景通知は service worker が OS 通知を出すため、本コンポーネントは前面時の UX 向上用。
 */
export function ForegroundNotifier() {
  const { user } = useAuth();
  const router = useRouter();

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
        /**
         * 前面にいる間は OS 通知が出せないので、これが唯一の気づく手段になる。
         * 既定（下部・4秒・操作なし）だと、スマホでは親指の下に小さく出て
         * すぐ消えるため見逃す。上部・長め・タップで遷移できる形にする。
         */
        toast(payload.title ?? "新着のお知らせ", {
          description: payload.body,
          position: "top-center",
          duration: 8000,
          ...(payload.url
            ? {
                action: {
                  label: "開く",
                  onClick: () => router.push(payload.url!),
                },
              }
            : {}),
        });
      }
      /**
       * 未読バッジを更新する。見逃しても後から件数で気づけるようにするため、
       * ここで取りこぼすとバッジが増えない。個別のキーを列挙すると
       * 追加のたびに漏れるので、キャッシュ済みのものをまとめて再検証する。
       */
      void mutate(() => true);
    });
    return () => {
      unsub?.();
    };
  }, [router]);

  return null;
}
