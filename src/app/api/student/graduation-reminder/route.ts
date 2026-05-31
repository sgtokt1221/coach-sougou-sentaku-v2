import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { sendGraduationReminder } from "@/lib/api/graduation-reminder";

/** 起動毎の連発を防ぐ最小間隔（6 時間） */
const THROTTLE_MS = 6 * 60 * 60 * 1000;

/**
 * POST /api/student/graduation-reminder
 * 本人が卒業済み×進路未登録なら、自分の端末へ進路登録のプッシュを送る（throttle 付き）。
 * サーバー定期実行が無い環境でも、アプリ起動時に呼ぶことで催促を継続する補完。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await adminDb.doc(`users/${uid}`).get();
    const data = snap.data();
    if (!data) return NextResponse.json({ needed: false });
    const r = await sendGraduationReminder(adminDb, uid, data, THROTTLE_MS);
    return NextResponse.json(r);
  } catch (err) {
    console.error("[student/graduation-reminder] error:", err);
    return NextResponse.json({ error: "失敗しました" }, { status: 500 });
  }
}
