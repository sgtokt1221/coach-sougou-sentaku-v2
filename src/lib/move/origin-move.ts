/**
 * サーバーを台湾（asia-east1）から東京（asia-northeast1）へ移すための決まり。
 *
 * App Hosting は地域を後から変えられないので、東京に新しいバックエンドを作り、
 * URL が変わる。旧サーバーは残して、画面を開いた人だけを新しい URL へ転送する。
 * `/api` は旧 URL でも動かし続ける（予約済みの送信・webhook・旧 URL の通知が宛先を持っている）。
 * 切り替えは MOVE_ENABLED を true にするコミット1つで行い、戻すときは revert する。
 */

export const OLD_HOST = "coach-app--coach-sougou-sentaku.asia-east1.hosted.app";
export const NEW_ORIGIN = "https://coach-tokyo--coach-sougou-sentaku.asia-northeast1.hosted.app";
export const NEW_HOST = new URL(NEW_ORIGIN).host;

/** 転送を有効にするか（切り替えのときに true にする） */
export const MOVE_ENABLED = false;

/** 旧 URL でも転送せずにそのまま返すパス */
const PASS_THROUGH_PREFIXES = ["/api/", "/_next/", "/__/"];
const PASS_THROUGH_FILES = [
  "/firebase-messaging-sw.js",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/robots.txt",
  "/favicon.ico",
];

/**
 * このリクエストを新しい URL へ転送するなら転送先を返す。しないなら null。
 * 画面（GET）だけを転送し、API・Next の内部ファイル・Service Worker・静的ファイルは通す。
 */
export function moveRedirectTarget(opts: {
  enabled: boolean;
  host: string | null;
  method: string;
  pathname: string;
  search: string;
}): string | null {
  if (!opts.enabled) return null;
  if (opts.host !== OLD_HOST) return null;
  if (opts.method !== "GET" && opts.method !== "HEAD") return null;
  const p = opts.pathname;
  if (p === "/api" || PASS_THROUGH_PREFIXES.some((x) => p.startsWith(x))) return null;
  if (PASS_THROUGH_FILES.includes(p)) return null;
  // 拡張子のあるファイル（画像・フォント・アイコンなど）は通す
  if (/\.[a-zA-Z0-9]{2,5}$/.test(p)) return null;
  return `${NEW_ORIGIN}${p}${opts.search}`;
}

/** 通知の登録がどの URL から来たか（Origin ヘッダのホスト） */
export function hostOfOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}
