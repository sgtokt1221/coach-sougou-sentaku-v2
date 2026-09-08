importScripts(
  "https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js"
);

/**
 * どの版が動いているかを見分けるための印。SW を変えたら必ず上げる。
 * 設定画面から読み出して「更新が届いたか」を確かめる。
 */
const SW_VERSION = "2026-09-09.1";

/**
 * 新しい SW をすぐ有効にする。
 *
 * これが無いと、新しい SW は全てのタブと PWA を閉じるまで「待機」のまま。
 * ホーム画面に入れた PWA は閉じられないことが多く、直しても数週間届かなかった。
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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

/**
 * バックグラウンド受信。
 *
 * ペイロードに notification があるときは SDK が自動で表示する。以前はここでも
 * showNotification していたため二重に出ていた（同じ tag で1つに畳まれ、
 * ブラウザによって挙動が変わっていた）。通常の送信は全て notification 付きなので
 * ここでは何もしない。
 *
 * notification が無い data だけの受信は、何か表示しないと iOS が購読を
 * 取り消すため、最低限の通知を出す。
 */
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const data = payload.data || {};
  self.registration.showNotification(data.title || "CoachFor通知", {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || `notice-${Date.now()}`,
    data: { url: data.url || "/" },
  });
});

/**
 * 通知のタップ。
 *
 * SDK が表示した通知（data.FCM_MSG を持つ）は SDK 自身が fcmOptions.link を開く。
 * ここで扱うのは、ページ側や上の onBackgroundMessage が自前で出した通知だけ。
 * 両方で扱うと2つ開く。
 *
 * 既に開いているウィンドウがあればそれを前に出して遷移させる。
 * 毎回 openWindow すると PWA のウィンドウが増え続ける。
 */
self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  if (data.FCM_MSG) return;
  event.notification.close();
  const url =
    typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  event.waitUntil(focusOrOpen(url));
});

async function focusOrOpen(path) {
  const target = new URL(path, self.location.origin).href;
  const wins = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const same = wins.find((w) => new URL(w.url).origin === self.location.origin);
  if (same) {
    await same.focus();
    if ("navigate" in same) {
      try {
        await same.navigate(target);
      } catch {
        // 遷移できない状態なら前に出すだけにする
      }
    }
    return;
  }
  await self.clients.openWindow(target);
}

/** 設定画面から版を問い合わせられるようにする */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_SW_VERSION") {
    event.ports?.[0]?.postMessage({ version: SW_VERSION });
  }
});
