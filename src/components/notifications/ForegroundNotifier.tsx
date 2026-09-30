"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { onForegroundMessage, refreshFcmToken } from "@/lib/firebase/messaging";
import { useAuth } from "@/contexts/AuthContext";

/**
 * フォアグラウンド (タブが前面) で FCM 通知を受けた時に、メッセージ系 SWR を
 * 再検証する。OS 通知は前面・背面とも service worker が出す。
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
    /**
     * OS 通知はサービスワーカーが出す（アプリを操作中でも出す。行き先の画面を
     * 開いているときだけ省く）。ここでトーストも出すと二重になるので出さない。
     *
     * 以前は操作中ならトーストだけにしていたが、スマホでは上部に8秒出て消える
     * だけで「使っている間は通知が来ない」と受け取られていた。
     *
     * 未読バッジと開いている会話はここで更新する。取りこぼすとバッジが増えず、
     * 行き先の画面を開いていても新しいメッセージが出ない。個別のキーを列挙すると
     * 追加のたびに漏れるので、キャッシュ済みのものをまとめて再検証する。
     */
    const unsub = onForegroundMessage(() => {
      void mutate(() => true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  return null;
}
