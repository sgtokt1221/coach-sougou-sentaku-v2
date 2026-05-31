import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { resetUnread } from "@/lib/chat/conversation";

/**
 * POST /api/teacher/students/[id]/feedback/read
 * 講師が担当生徒の講師スレッドを開いた時に未読をクリアする。
 * teacherConversations.unreadByCoach を 0 にし、生徒発言の read=true を一括反映。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (
      role !== "superadmin" &&
      !getAssignedTeacherIds(studentDoc.data()).includes(uid)
    ) {
      return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
    }

    await resetUnread(id, "coach", "teacherConversations", `${id}__${uid}`);

    // 自分(講師)のスレッドの生徒発言 (createdBy === 生徒uid) の未読を read=true に
    const unreadSnap = await adminDb
      .collection(`users/${id}/teacherFeedback`)
      .where("teacherId", "==", uid)
      .where("read", "==", false)
      .get();
    const batch = adminDb.batch();
    let n = 0;
    unreadSnap.docs.forEach((d) => {
      if ((d.data().createdBy as string) === id) {
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
