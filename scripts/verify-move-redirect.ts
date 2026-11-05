/**
 * 東京移行の転送判定の確認（純関数のみ）。
 *   npx tsx scripts/verify-move-redirect.ts
 */
import { NEW_ORIGIN, OLD_HOST, moveRedirectTarget } from "../src/lib/move/origin-move";

let failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK " : "NG "} ${name}${ok ? "" : `: ${actual} ≠ ${expected}`}`);
}
const base = { enabled: true, host: OLD_HOST, method: "GET", search: "" };
eq("無効なら転送しない", moveRedirectTarget({ ...base, enabled: false, pathname: "/student/dashboard" }), null);
eq("画面は転送", moveRedirectTarget({ ...base, pathname: "/student/dashboard" }), `${NEW_ORIGIN}/student/dashboard`);
eq("クエリも付ける", moveRedirectTarget({ ...base, pathname: "/admin/students/x", search: "?tab=a" }), `${NEW_ORIGIN}/admin/students/x?tab=a`);
eq("トップも転送", moveRedirectTarget({ ...base, pathname: "/" }), `${NEW_ORIGIN}/`);
eq("API は通す", moveRedirectTarget({ ...base, pathname: "/api/cron/scheduled-feedback" }), null);
eq("API の POST も通す", moveRedirectTarget({ ...base, method: "POST", pathname: "/login" }), null);
eq("Service Worker は通す", moveRedirectTarget({ ...base, pathname: "/firebase-messaging-sw.js" }), null);
eq("静的ファイルは通す", moveRedirectTarget({ ...base, pathname: "/logo.svg" }), null);
eq("Next の内部は通す", moveRedirectTarget({ ...base, pathname: "/_next/static/a.js" }), null);
eq("新しいホストでは何もしない", moveRedirectTarget({ ...base, host: "coach-tokyo--coach-sougou-sentaku.asia-northeast1.hosted.app", pathname: "/student/dashboard" }), null);
eq("localhost では何もしない", moveRedirectTarget({ ...base, host: "localhost:3000", pathname: "/" }), null);
if (failed) { console.error(`\n${failed} 件失敗`); process.exit(1); }
console.log("\nすべて OK");
