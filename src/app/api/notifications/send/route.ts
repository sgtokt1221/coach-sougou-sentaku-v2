import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface SendNotificationBody {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /**
   * 通知種別。指定すると相手の設定に従う。管理者が手動で送る用途もあるため
   * 省略可能にしてあるが、自動送信から呼ぶときは必ず指定すること。
   */
  kind?: string;
}

/**
 * POST /api/notifications/send — 指定ユーザーにPush通知を送信
 * admin/teacher/superadminのみ実行可能
 */
export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { userId, title, body, data, kind } =
    (await request.json()) as SendNotificationBody;

  if (!userId || !title || !body) {
    return NextResponse.json(
      { error: "userId, title, body are required" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  /**
   * 送信は sendFcmToUser に一本化する。
   * 以前はここで独自に送っており、token 欠落の文書が1つ混ざると一括送信ごと
   * 落ち、失効の削除も一部の種類しか見ておらず、成功の記録も無かった。
   *
   * kind を省略した手動送信は、これまでどおり相手の設定を無視する（force）。
   */
  const { sendFcmToUser } = await import("@/lib/chat/conversation");
  const r = await sendFcmToUser(
    userId,
    { title, body, url: data?.url ?? "/" },
    kind ?? "message",
    { force: !kind }
  );

  if (r.skipped === "prefs") {
    return NextResponse.json({
      success: true,
      sentTo: 0,
      message: "受信設定でオフ",
    });
  }
  if (r.skipped === "no-tokens") {
    return NextResponse.json({
      success: true,
      sentTo: 0,
      message: "通知トークンが未登録",
    });
  }
  return NextResponse.json({
    success: true,
    sentTo: r.sent,
    failed: r.failed,
    pruned: r.pruned,
  });
}
