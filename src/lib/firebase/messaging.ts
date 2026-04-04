"use client";

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
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
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });
    return token;
  } catch (err) {
    console.error("[FCM] Failed to get token:", err);
    return null;
  }
}

/**
 * FCMトークンをFirestoreに保存（API経由）
 */
export async function saveFcmToken(idToken: string, fcmToken: string): Promise<void> {
  await fetch("/api/notifications/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fcmToken }),
  });
}

/**
 * フォアグラウンド通知リスナーを登録
 */
export function onForegroundMessage(callback: (payload: { title?: string; body?: string }) => void): (() => void) | null {
  const msg = getMessagingInstance();
  if (!msg) return null;

  const unsubscribe = onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
  return unsubscribe;
}
