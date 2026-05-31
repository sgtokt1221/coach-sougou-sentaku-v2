import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/** 講師インボックスの 1 行 (担当生徒 + 講師スレッドのサマリ) */
interface TeacherStudentItem {
  studentId: string;
  studentName: string;
  studentPhotoURL?: string | null;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadByTeacher: number;
}

/**
 * GET /api/teacher/students
 * 講師の担当生徒(assignedTeacherId == 自分)一覧を、講師スレッドのサマリ
 * (teacherConversations) と結合して返す。最終メッセージ時刻の降順。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const studentsSnap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("assignedTeacherIds", "array-contains", uid)
      .get();

    const items: TeacherStudentItem[] = await Promise.all(
      studentsSnap.docs.map(async (d) => {
        const data = d.data();
        // 講師別スレッドのサマリ doc は `${studentId}__${teacherId}`
        const conv = await adminDb!.doc(`teacherConversations/${d.id}__${uid}`).get();
        const c = conv.data();
        return {
          studentId: d.id,
          studentName: (data.displayName as string) ?? "生徒",
          studentPhotoURL: (data.photoURL as string | undefined) ?? null,
          lastMessageText: (c?.lastMessageText as string) ?? "",
          lastMessageAt:
            c?.lastMessageAt?.toDate?.()?.toISOString() ?? null,
          unreadByTeacher:
            typeof c?.unreadByCoach === "number" ? c.unreadByCoach : 0,
        };
      })
    );

    items.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Teacher students GET error:", error);
    return NextResponse.json(
      { error: "担当生徒の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
