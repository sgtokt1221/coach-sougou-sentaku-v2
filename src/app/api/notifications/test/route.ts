import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";

/**
 * POST /api/notifications/test — 自分宛にテスト通知を1通送る。
 *
 * 「届かない気がする」を切り分けるための入口。設定の ON/OFF は無視して送る
 * （切っているから届かないのか、壊れていて届かないのかを分けるため）。
 * 何台に送れて何台で失敗したかを返す。0台なら「登録が無い」と画面に出す。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const settingsPath =
    auth.role === "student" ? "/student/settings" : "/admin/settings";

  const { sendFcmToUser } = await import("@/lib/chat/conversation");
  const result = await sendFcmToUser(
    auth.uid,
    {
      title: "テスト通知",
      body: "この通知が見えていれば、設定は正しく動いています",
      url: settingsPath,
    },
    "test",
    { force: true }
  );

  return NextResponse.json(result);
}
