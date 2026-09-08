/**
 * プッシュ通知ペイロードの検証。
 *
 * 本番で「3通来ても1通しか見えない」「タップで生徒ページに飛ぶ」が起きていた。
 * どちらもペイロードの形の問題なので、ここで静的に確かめる。
 *
 * 実行: npx tsx scripts/verify-push-payload.ts
 */

import assert from "node:assert";
import {
  PUSH_BODY_MAX,
  PUSH_ICON,
  buildPushMessage,
  makePushTag,
  normalizePushUrl,
  truncatePushBody,
} from "../src/lib/notifications/push-payload";

// --- tag は送信ごとに一意。同じ tag だと OS が前の通知を上書きする ---
{
  const a = buildPushMessage(
    { title: "t", body: "b", url: "/student/feedback", kind: "feedback" },
    { now: 1000, nonce: "aaa" }
  );
  const b = buildPushMessage(
    { title: "t", body: "b", url: "/student/feedback", kind: "feedback" },
    { now: 1000, nonce: "bbb" }
  );
  assert.notEqual(a.webpush.notification.tag, b.webpush.notification.tag);
  // 時刻が違えば nonce が同じでも別
  const c = buildPushMessage(
    { title: "t", body: "b", url: "/student/feedback", kind: "feedback" },
    { now: 1001, nonce: "aaa" }
  );
  assert.notEqual(a.webpush.notification.tag, c.webpush.notification.tag);
  // 何も渡さなくても連続呼び出しで一意
  const d = buildPushMessage({ title: "t", body: "b", url: "/x", kind: "k" });
  const e = buildPushMessage({ title: "t", body: "b", url: "/x", kind: "k" });
  assert.notEqual(d.webpush.notification.tag, e.webpush.notification.tag);
  // "default" は二度と使わない
  assert.notEqual(a.webpush.notification.tag, "default");
}

// --- tag は data にも同じ値で入る（前面で自前表示するときに同じ tag を使う） ---
{
  const m = buildPushMessage(
    { title: "t", body: "b", url: "/admin/messages/x", kind: "inboundMessage" },
    { now: 5, nonce: "n" }
  );
  assert.equal(m.data.tag, m.webpush.notification.tag);
  assert.equal(m.data.kind, "inboundMessage");
}

// --- クリック先は fcmOptions.link と data.url と webpush.notification.data.url の3つが一致 ---
{
  const m = buildPushMessage({
    title: "t",
    body: "b",
    url: "/admin/messages/abc",
    kind: "inboundMessage",
  });
  assert.equal(m.webpush.fcmOptions.link, "/admin/messages/abc");
  assert.equal(m.data.url, "/admin/messages/abc");
  assert.equal(m.webpush.notification.data.url, "/admin/messages/abc");
  // 管理者向けの通知が /student/ に落ちない
  assert.ok(!m.webpush.fcmOptions.link.startsWith("/student/"));
}

// --- url は内部パスだけ。外部や空はトップに落とす（タップで変な所へ飛ばさない） ---
{
  assert.equal(normalizePushUrl("/student/feedback"), "/student/feedback");
  assert.equal(normalizePushUrl("https://evil.example/x"), "/");
  assert.equal(normalizePushUrl("//evil.example"), "/");
  assert.equal(normalizePushUrl(""), "/");
  assert.equal(normalizePushUrl("  /call/abc  "), "/call/abc");
  // @ts-expect-error 型外の入力でも落ちない
  assert.equal(normalizePushUrl(undefined), "/");
}

// --- 本文は50文字で切る。空なら付けない ---
{
  const long = "あ".repeat(PUSH_BODY_MAX + 10);
  const t = truncatePushBody(long);
  assert.equal(t.length, PUSH_BODY_MAX + 1);
  assert.ok(t.endsWith("…"));
  assert.equal(truncatePushBody("短い"), "短い");
  assert.equal(truncatePushBody("  余白  "), "余白");

  const empty = buildPushMessage({ title: "t", body: "", kind: "k", url: "/" });
  assert.equal("body" in empty.notification, false);
  const spaces = buildPushMessage({
    title: "t",
    body: "   ",
    kind: "k",
    url: "/",
  });
  assert.equal("body" in spaces.notification, false);
}

// --- タイトルが空でも落ちない ---
{
  const m = buildPushMessage({ title: "", body: "b", kind: "k", url: "/" });
  assert.ok(m.notification.title.length > 0);
}

// --- data は全て文字列（FCM が非文字列を拒否する） ---
{
  const m = buildPushMessage({ title: "t", body: "b", kind: "k", url: "/x" });
  for (const [k, v] of Object.entries(m.data)) {
    assert.equal(typeof v, "string", `data.${k} が文字列でない`);
  }
}

// --- アイコンは実在するファイル ---
{
  const m = buildPushMessage({ title: "t", body: "b", kind: "k", url: "/x" });
  assert.equal(m.webpush.notification.icon, PUSH_ICON);
  assert.equal(PUSH_ICON, "/icons/icon-192.png");
}

// --- tag の kind 部分は記号を落とす（OS 側で扱えない文字を入れない） ---
{
  assert.equal(makePushTag("a/b c", 1, "n"), "abc-1-n");
  assert.equal(makePushTag("", 1, "n"), "notice-1-n");
}

console.log("verify-push-payload OK");
