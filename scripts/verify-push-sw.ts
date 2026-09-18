import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * サービスワーカーの push 処理を、実物のファイルを読み込んで確かめる。
 *
 * 直したいのは「PWA を背面に回すと通知がどこにも出ない」件。FCM の SW は
 * 見えているウィンドウがあればページへ転送して自分では出さないが、背面の
 * PWA はウィンドウが残ったままページが凍結されるため、転送先が動かない。
 * ここでは「操作中のウィンドウが無ければ SW が自分で出す」ことを確かめる。
 *
 * ブラウザが無くても回せるように、self / firebase / clients を差し替えて
 * 実物の firebase-messaging-sw.js を評価する。
 */

interface FakeClient {
  focused: boolean;
  visibilityState: string;
}

function loadServiceWorker(clients: FakeClient[]) {
  const code = readFileSync("public/firebase-messaging-sw.js", "utf8");
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  const shown: { title: string; options: Record<string, unknown> }[] = [];
  const pending: Promise<unknown>[] = [];

  const self = {
    location: {
      search: "?apiKey=x&projectId=y",
      origin: "https://example.test",
    },
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      (listeners[type] ??= []).push(fn);
    },
    skipWaiting: () => {},
    clients: {
      claim: async () => {},
      matchAll: async () => clients,
      openWindow: async () => {},
    },
    registration: {
      showNotification: async (
        title: string,
        options: Record<string, unknown>
      ) => {
        shown.push({ title, options });
      },
    },
  };

  const firebase = {
    initializeApp: () => {},
    messaging: () => ({ onBackgroundMessage: () => {} }),
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function("self", "firebase", "importScripts", code);
  run(self, firebase, () => {});

  return {
    shown,
    async push(payload: unknown) {
      for (const fn of listeners.push ?? []) {
        fn({
          data: { json: () => payload },
          waitUntil: (p: Promise<unknown>) => pending.push(p),
        });
      }
      await Promise.all(pending);
    },
  };
}

const PAYLOAD = {
  notification: { title: "新しいメッセージ", body: "先生からの返信です" },
  data: { url: "/student/messages", tag: "message-123-abc", kind: "message" },
};

async function main() {
  // 1. 誰も開いていない（通常のバックグラウンド）
  {
    const sw = loadServiceWorker([]);
    await sw.push(PAYLOAD);
    assert.equal(sw.shown.length, 1, "ウィンドウが無いときは通知を出す");
    assert.equal(sw.shown[0].title, "新しいメッセージ");
    assert.equal(sw.shown[0].options.tag, "message-123-abc");
    assert.deepEqual(sw.shown[0].options.data, { url: "/student/messages" });
  }

  // 2. 背面の PWA（ウィンドウは残っているがページは凍結）— 今回直したい場面
  {
    const sw = loadServiceWorker([
      { focused: false, visibilityState: "visible" },
    ]);
    await sw.push(PAYLOAD);
    assert.equal(
      sw.shown.length,
      1,
      "操作されていないウィンドウしか無いときは SW が通知を出す"
    );
  }

  // 3. 実際に操作中（ページがトーストを出すので SW は出さない）
  {
    const sw = loadServiceWorker([
      { focused: true, visibilityState: "visible" },
    ]);
    await sw.push(PAYLOAD);
    assert.equal(sw.shown.length, 0, "操作中は SW から通知を出さない");
  }

  // 4. 表示するものが無いペイロードでは出さない
  {
    const sw = loadServiceWorker([]);
    await sw.push({ data: { url: "/" } });
    assert.equal(sw.shown.length, 0, "title が無ければ出さない");
  }

  console.log("[verify-push-sw] OK (4件)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
