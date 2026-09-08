"use client";

import {
  getMessaging,
  getToken,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import app from "@/lib/firebase/config";

let messaging: Messaging | null = null;

/**
 * FCMインスタンスを取得（ブラウザ環境 + Firebase設定済みの場合のみ）
 */
function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!app) return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

/**
 * メッセージ用 Service Worker を登録する。
 *
 * SW からは NEXT_PUBLIC_* を読めないので、Firebase の設定をクエリ文字列で
 * 渡す。値は元々クライアントに露出している公開設定。
 */
function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
  const qs = new URLSearchParams(config).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`);
}

/**
 * 通知許可をリクエストしてFCMトークンを取得
 * @returns FCMトークン or null（拒否/未対応の場合）
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const msg = getMessagingInstance();
  if (!msg) return null;

  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[FCM] VAPID key not configured");
      return null;
    }
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: await registerMessagingServiceWorker(),
    });
    return token;
  } catch (err) {
    console.error("[FCM] Failed to get token:", err);
    return null;
  }
}

/**
 * この端末を識別する ID。localStorage に1回だけ作って持ち続ける。
 *
 * FCM のトークンは SW の更新やブラウザの都合で入れ替わる。以前はトークンを
 * そのまま文書 ID にしていたため、同じ端末で入れ替わるたびに文書が増え、
 * 1端末に3〜6件の死んだトークンが積み上がっていた（本番で確認）。
 * 端末 ID を添えて保存し、同じ端末の古い文書はサーバ側で消す。
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "coach-device-id";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage が使えない環境（プライベートモード等）では毎回変わるが、
    // 通知自体は届く。積み上がりだけ防げない
    return "";
  }
}

/**
 * FCMトークンをFirestoreに保存（API経由）
 *
 * 端末情報はクライアントから送る。サーバーの User-Agent ヘッダに頼っていたが、
 * 本番では全件 "Google" として記録されており、どの端末のトークンかを
 * 判別できなかった（届かない端末の切り分けができない）。
 *
 * standalone は「ホーム画面に追加したPWAの中で登録したか」。iOS は
 * インストール済みPWA内で取った購読でないと通知が届かないため、
 * これが false のiOS端末は届かなくて当たり前、と判断できるようにする。
 */
export async function saveFcmToken(
  idToken: string,
  fcmToken: string
): Promise<void> {
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari は display-mode を返さない時期があるため独自プロパティも見る
      (window.navigator as { standalone?: boolean }).standalone === true);

  const res = await fetch("/api/notifications/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fcmToken,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      standalone,
      deviceId: getDeviceId(),
    }),
  });
  /**
   * 結果を見ずに戻ると、401 や 500 でも「有効にしました」と出てしまう。
   * 保存できていないのに緑になる、が本番で起きていた原因の1つ。
   */
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      /* 本文が無くてもよい */
    }
    throw new Error(
      detail ||
        `通知の登録に失敗しました（${res.status}）。もう一度お試しください`
    );
  }
}

/**
 * 既に許可済みの利用者のトークンを取り直して保存する。
 *
 * FCM のWebトークンは、SWの更新やブラウザ側の都合で入れ替わる。今までは
 * 「通知を許可した瞬間」にしか保存しておらず、入れ替わったあとは古い
 * トークンへ送り続けていた（送信側は失敗しても黙るので気づけない）。
 * これが「Pushが来るときと来ないときがある」の主因。
 *
 * 許可を求めるダイアログは出さない。未許可の人の体験は変えない。
 */
export async function refreshFcmToken(idToken: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const msg = getMessagingInstance();
  if (!msg) return;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;

  try {
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: await registerMessagingServiceWorker(),
    });
    if (token) await saveFcmToken(idToken, token);
  } catch (err) {
    console.warn("[FCM] token refresh failed:", err);
  }
}

/**
 * フォアグラウンド通知リスナーを登録。
 *
 * アプリが前面にあるとき、FCM は OS 通知を出さずにここへ配信する（仕様）。
 * 遷移先も渡す。通知をタップしたときに該当画面へ行けないと、
 * 「通知が来たのにどこを見ればいいか分からない」状態になる。
 */
export function onForegroundMessage(
  callback: (payload: {
    title?: string;
    body?: string;
    url?: string;
    /** 送信側が付けた一意の tag。自前で OS 通知を出すときも同じものを使う */
    tag?: string;
  }) => void
): (() => void) | null {
  const msg = getMessagingInstance();
  if (!msg) return null;

  const unsubscribe = onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      url:
        (payload.data?.url as string | undefined) ??
        payload.fcmOptions?.link ??
        undefined,
      tag: payload.data?.tag as string | undefined,
    });
  });
  return unsubscribe;
}

/**
 * ページ側から OS 通知を出す。
 *
 * タブが存在すると FCM は onMessage に配信し、サービスワーカーは OS 通知を
 * 出さない（仕様）。タブを開いたまま別の作業をしていると、アプリ内トーストが
 * 見ていない画面で8秒出て消えるだけになる。これが「届かない」の主因だった。
 * そういうときはここで OS 通知を出す。
 *
 * サービスワーカー側の notificationclick が data.url を開く。
 */
export async function showLocalNotification(payload: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(payload.title, {
      body: payload.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag ?? `notice-${Date.now()}`,
      data: { url: payload.url ?? "/" },
    });
    return true;
  } catch (err) {
    console.warn("[FCM] local notification failed:", err);
    return false;
  }
}

/**
 * 動いているサービスワーカーの版を聞く。
 * 「直したのに届かない」ときに、古い SW のままかどうかを切り分けるため。
 * 応答が無ければ null（SW が無い、または古くて応答しない）。
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  const ctrl = navigator.serviceWorker.controller;
  if (!ctrl) return null;
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    ch.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve((e.data as { version?: string })?.version ?? null);
    };
    try {
      ctrl.postMessage({ type: "GET_SW_VERSION" }, [ch.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
