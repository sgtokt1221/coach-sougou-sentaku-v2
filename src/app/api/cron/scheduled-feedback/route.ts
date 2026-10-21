import { NextRequest, NextResponse } from "next/server";
import { deliverScheduledFeedback } from "@/lib/chat/scheduled-feedback";

/**
 * POST /api/cron/scheduled-feedback
 * 予約送信の配信。予約時に積んだ Cloud Tasks のタスクが予約時刻に呼ぶ。
 * `x-cron-secret: $CRON_SECRET` が無ければ 401。
 * 5xx を返すと Cloud Tasks が再試行する（二重には届かない）。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    studentId?: unknown;
    scheduledId?: unknown;
  } | null;
  if (
    typeof body?.studentId !== "string" ||
    typeof body?.scheduledId !== "string" ||
    body.studentId.includes("/") ||
    body.scheduledId.includes("/")
  ) {
    // 再試行しても直らないので 4xx で止める
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const result = await deliverScheduledFeedback(
      adminDb,
      body.studentId,
      body.scheduledId
    );
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[cron/scheduled-feedback] error:", err);
    return NextResponse.json({ error: "失敗しました" }, { status: 500 });
  }
}
