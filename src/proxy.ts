import { NextResponse, type NextRequest } from "next/server";
import { MOVE_ENABLED, moveRedirectTarget } from "@/lib/move/origin-move";

/**
 * 旧 URL（台湾のサーバー）で画面を開いた人を、新しい URL（東京）へ転送する。
 * 判定は src/lib/move/origin-move.ts。MOVE_ENABLED が false の間は何もしない。
 */
export function proxy(request: NextRequest) {
  const target = moveRedirectTarget({
    enabled: MOVE_ENABLED,
    host: request.headers.get("host"),
    method: request.method,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });
  return target ? NextResponse.redirect(target, 308) : NextResponse.next();
}

export const config = {
  // API と Next の内部ファイルは最初から通さない（判定の中でも除いている）
  matcher: ["/((?!api/|_next/).*)"],
};
