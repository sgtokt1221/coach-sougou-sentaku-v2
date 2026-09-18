import { NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
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
   * 宛先が自分の担当・自分の塾の生徒かを確かめる。
   *
   * ロールだけ見て userId をそのまま使っていたため、本番のように複数の塾が
   * 同居していると、別法人の管理者が他法人の生徒へ通知を撃てた。
   * 他のAPIと同じ scopeByOrganization を通す。
   */
  const targetDoc = await adminDb.doc(`users/${userId}`).get();
  if (!targetDoc.exists) {
    return NextResponse.json(
      { error: "宛先の利用者が見つかりません" },
      { status: 404 }
    );
  }
  const targetData = targetDoc.data();
  const denied = await scopeByOrganization({
    requesterUid: auth.uid,
    requesterRole: auth.role,
    studentUid: userId,
    studentData: {
      managedBy: targetData?.managedBy as string | undefined,
      organizationId: targetData?.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(targetData),
    },
    // 担当講師は自分の生徒へ連絡できる
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

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
