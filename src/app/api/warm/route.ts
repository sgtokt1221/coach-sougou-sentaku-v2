import { NextResponse } from "next/server";

/**
 * サーバーを起こしておくための入口（2026-11-26）。Cloud Scheduler が日中10分おきに叩く。
 * 本番は使われないとサーバーが止まり、次の最初のアクセスが立ち上がり（約13秒）を待っていた。
 * 「処理中だけ課金」の方式なので、起きて待っている間は課金されない。
 * データベースには触れない。CDN に覚えさせると起こせないので no-store にする。
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
