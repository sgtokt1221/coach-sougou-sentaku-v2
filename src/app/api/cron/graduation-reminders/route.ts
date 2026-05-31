import { NextRequest, NextResponse } from "next/server";
import {
  needsGraduationReminder,
  sendGraduationReminder,
} from "@/lib/api/graduation-reminder";

/**
 * POST /api/cron/graduation-reminders
 * 卒業済み×進路未登録の全生徒へ進路登録のプッシュ通知を一括送信する（日次想定）。
 * Cloud Scheduler 等から `x-cron-secret: $CRON_SECRET` ヘッダ付きで呼ぶ。
 * CRON_SECRET 未設定/不一致は 401。
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

  try {
    const snap = await adminDb.collection("users").where("role", "==", "student").get();
    let sent = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!needsGraduationReminder(data)) continue;
      const r = await sendGraduationReminder(adminDb, doc.id, data);
      if (r.sent) sent++;
    }
    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error("[cron/graduation-reminders] error:", err);
    return NextResponse.json({ error: "失敗しました" }, { status: 500 });
  }
}
