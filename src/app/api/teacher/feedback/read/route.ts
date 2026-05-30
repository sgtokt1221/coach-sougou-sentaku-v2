import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { resetUnread } from "@/lib/chat/conversation";

/**
 * POST /api/teacher/feedback/read
 * 講師がスレッドを開いた時に未読をクリアし、管理者発言を read=true にする。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    await resetUnread(uid, "student");

    // 管理者発言 (createdBy !== uid) を read=true に一括更新
    const unreadSnap = await adminDb
      .collection(`users/${uid}/feedback`)
      .where("read", "==", false)
      .get();
    const batch = adminDb.batch();
    let n = 0;
    unreadSnap.docs.forEach((d) => {
      if ((d.data().createdBy as string) !== uid) {
        batch.update(d.ref, { read: true });
        n++;
      }
    });
    if (n > 0) await batch.commit();

    return NextResponse.json({ success: true, marked: n });
  } catch (error) {
    console.error("Teacher feedback read error:", error);
    return NextResponse.json({ error: "既読処理に失敗しました" }, { status: 500 });
  }
}
