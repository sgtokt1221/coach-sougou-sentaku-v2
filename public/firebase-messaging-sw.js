/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js");

// 設定は登録時のクエリ文字列から受け取る。
// 以前は self.__FIREBASE_CONFIG__ を参照していたが、この変数はどこからも
// 定義されておらず、全項目が空文字で初期化されていた（＝バックグラウンド
// 通知が動かない）。Firebase の web 設定は元々公開値なのでクエリで渡してよい。
const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey: params.get("apiKey") ?? "",
  authDomain: params.get("authDomain") ?? "",
  projectId: params.get("projectId") ?? "",
  storageBucket: params.get("storageBucket") ?? "",
  messagingSenderId: params.get("messagingSenderId") ?? "",
  appId: params.get("appId") ?? "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "CoachFor通知";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data,
    tag: payload.data?.type ?? "default",
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/student/dashboard";
  event.waitUntil(clients.openWindow(url));
});
