import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface TeacherProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  studentCount?: number;
}

interface TeacherDetail {
  profile: TeacherProfile;
  managedStudents: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 講師の基本情報を取得
    const teacherDoc = await adminDb.doc(`users/${id}`).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "講師が見つかりません" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // roleがteacherまたはadminであることを確認
    if (!["teacher", "admin"].includes(teacherData.role)) {
      return NextResponse.json(
        { error: "指定されたユーザーは講師ではありません" },
        { status: 400 }
      );
    }

    // 担当生徒を取得
    const studentsQuery = adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("managedBy", "==", id);

    const studentsSnap = await studentsQuery.get();
    const managedStudents = studentsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || "",
        email: data.email || "",
      };
    });

    const detail: TeacherDetail = {
      profile: {
        uid: id,
        displayName: teacherData.displayName || "",
        email: teacherData.email || "",
        role: teacherData.role,
        createdAt: teacherData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        studentCount: managedStudents.length,
      },
      managedStudents,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Teacher detail error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `講師詳細の取得中にエラー: ${message}` },
      { status: 500 }
    );
  }
}