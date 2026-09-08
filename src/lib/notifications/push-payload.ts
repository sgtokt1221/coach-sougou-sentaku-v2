/**
 * プッシュ通知のペイロードを1か所で組み立てる。
 *
 * 送信経路が4本あり、それぞれが別々の形で組んでいたため、次の不具合が
 * 本番で起きていた。
 *
 * - 全通知が同じ tag（"default"）になり、OS が前の通知を上書きする。
 *   3通来ても1通しか見えない。
 * - サービスワーカー側で二重に描画される（SDK の自動表示 + onBackgroundMessage）。
 * - タップ先が取れず、管理者でも /student/dashboard に飛ぶ。
 *
 * ここで webpush.notification に tag・icon・data を明示し、クリック先は
 * webpush.fcmOptions.link に寄せる。SDK の自動表示だけで正しく出て、
 * 正しい場所に飛ぶ形にする。古いサービスワーカーが残っている端末でも、
 * 同じ tag なので二重描画が1つに畳まれ、壊れない。
 *
 * 純関数。Firebase にも Firestore にも依存しないので
 * scripts/verify-push-payload.ts から直接検証する。
 */

/** 本文の上限。OS の通知は長いと途中で切れて読めないため、こちらで切る */
export const PUSH_BODY_MAX = 50;

/** 通知アイコン。public/icons にある */
export const PUSH_ICON = "/icons/icon-192.png";

export interface PushInput {
  title: string;
  body: string;
  /** アプリ内のパス。"/" で始まらないものは受け付けず "/" に落とす */
  url: string;
  /** 通知種別（catalog.ts の id）。tag と data.kind に入る */
  kind: string;
}

/** firebase-admin の MulticastMessage から tokens を除いた形 */
export interface PushMessageShape {
  notification: { title: string; body?: string };
  data: Record<string, string>;
  webpush: {
    notification: {
      tag: string;
      icon: string;
      badge: string;
      data: { url: string };
    };
    fcmOptions: { link: string };
  };
}

export function truncatePushBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= PUSH_BODY_MAX) return trimmed;
  return trimmed.slice(0, PUSH_BODY_MAX) + "…";
}

/** アプリ内パスだけ通す。外部URLや空文字はトップに落とす */
export function normalizePushUrl(url: string): string {
  if (typeof url !== "string") return "/";
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//")) return "/";
  return u;
}

/**
 * 送信ごとに一意な tag を作る。
 * 同じ tag だと OS が前の通知を置き換えるので、毎回変える。
 * 逆に「同じ会話は1つにまとめたい」場合はここを変える（今はまとめない）。
 */
export function makePushTag(kind: string, now: number, nonce: string): string {
  const safeKind = kind.replace(/[^A-Za-z0-9_-]/g, "") || "notice";
  return `${safeKind}-${now}-${nonce}`;
}

export function buildPushMessage(
  input: PushInput,
  opts: { now?: number; nonce?: string } = {}
): PushMessageShape {
  const now = opts.now ?? Date.now();
  const nonce = opts.nonce ?? Math.random().toString(36).slice(2, 8);
  const url = normalizePushUrl(input.url);
  const tag = makePushTag(input.kind, now, nonce);
  const body = truncatePushBody(input.body);
  const title = input.title.trim() || "CoachFor通知";

  return {
    notification: {
      title,
      // 空の本文を送ると、本文欄だけ空いた不格好な通知になるので付けない
      ...(body ? { body } : {}),
    },
    // data はすべて文字列でなければ FCM が拒否する
    data: { url, kind: input.kind, tag },
    webpush: {
      notification: {
        tag,
        icon: PUSH_ICON,
        badge: PUSH_ICON,
        data: { url },
      },
      fcmOptions: { link: url },
    },
  };
}

/**
 * 通知本文に入れる日時。必ず日本時間で組む。
 *
 * サーバー（Cloud Run）は UTC なので、Date#getHours() などをそのまま使うと
 * 「14:00 の面談」が「05:00」と通知される（本番で起きていた）。
 */
const JST = "Asia/Tokyo";

function jstParts(iso: string): Record<string, string> | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

/** 例: "9/10(水) 14:00" */
export function formatSessionTimeJst(iso: string): string {
  const p = jstParts(iso);
  if (!p) return "";
  return `${p.month}/${p.day}(${p.weekday}) ${p.hour}:${p.minute}`;
}

/** 例: "14:00" */
export function formatTimeJst(iso: string): string {
  const p = jstParts(iso);
  if (!p) return "";
  return `${p.hour}:${p.minute}`;
}
