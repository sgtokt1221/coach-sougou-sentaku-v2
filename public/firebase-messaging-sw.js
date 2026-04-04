/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey ?? "",
  authDomain: self.__FIREBASE_CONFIG__?.authDomain ?? "",
  projectId: self.__FIREBASE_CONFIG__?.projectId ?? "",
  storageBucket: self.__FIREBASE_CONFIG__?.storageBucket ?? "",
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId ?? "",
  appId: self.__FIREBASE_CONFIG__?.appId ?? "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "CoachFor通知";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/logo.svg",
    badge: "/logo.svg",
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
