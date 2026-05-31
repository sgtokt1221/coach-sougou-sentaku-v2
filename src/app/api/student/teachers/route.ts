import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

/** 生徒の担当講師 1 人分 (講師タブのセレクタ用) */
interface StudentTeacherItem {
  teacherId: string;
  displayName: string;
  photoURL?: string | null;
  /** その講師スレッドで生徒側に溜まっている未読数 */
  unread: number;
}

/**
 * GET /api/student/teachers
 * ログイン中の生徒の担当講師(assignedTeacherIds)一覧を、
 * 各講師スレッドの未読数つきで返す。生徒のメッセージ「講師」タブのセレクタ用。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const teacherIds = getAssignedTeacherIds(userDoc.data());
    if (teacherIds.length === 0) return NextResponse.json([]);

    const items: StudentTeacherItem[] = await Promise.all(
      teacherIds.map(async (teacherId) => {
        const [tDoc, conv] = await Promise.all([
          adminDb!.doc(`users/${teacherId}`).get(),
          adminDb!.doc(`teacherConversations/${uid}__${teacherId}`).get(),
        ]);
        const t = tDoc.data();
        const c = conv.data();
        return {
          teacherId,
          displayName: (t?.displayName as string) ?? "講師",
          photoURL: (t?.photoURL as string | undefined) ?? null,
          unread:
            typeof c?.unreadByStudent === "number" ? c.unreadByStudent : 0,
        };
      })
    );

    return NextResponse.json(items);
  } catch (error) {
    console.error("Student teachers GET error:", error);
    return NextResponse.json(
      { error: "担当講師の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
