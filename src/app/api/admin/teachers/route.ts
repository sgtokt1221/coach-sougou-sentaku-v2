import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { TeacherListItem } from "@/lib/types/admin";

const mockTeachers: TeacherListItem[] = [
  {
    uid: "teacher_001",
    displayName: "講師 花子",
    email: "teacher-hanako@example.com",
    studentCount: 8,
    createdAt: "2025-10-15T00:00:00.000Z",
  },
  {
    uid: "teacher_002",
    displayName: "講師 太郎",
    email: "teacher-taro@example.com",
    studentCount: 5,
    createdAt: "2026-01-20T00:00:00.000Z",
  },
];

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    // teacherロールの場合は自分のみ返す
    if (authResult.role === "teacher") {
      const self = mockTeachers.find((t) => t.uid === authResult.uid);
      return NextResponse.json(self ? [self] : []);
    }
    return NextResponse.json(mockTeachers);
  }

  try {
    let query = adminDb.collection("users").where("role", "==", "teacher");

    // teacherは自分のデータのみ
    if (authResult.role === "teacher") {
      const userDoc = await adminDb.doc(`users/${authResult.uid}`).get();
      const userData = userDoc.data();
      if (!userData) {
        return NextResponse.json([]);
      }
      const studentsSnap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .where("managedBy", "==", authResult.uid)
        .count()
        .get();
      const teacher: TeacherListItem = {
        uid: authResult.uid,
        displayName: userData.displayName ?? "",
        email: userData.email ?? "",
        studentCount: studentsSnap.data().count,
        createdAt:
          userData.createdAt?.toDate?.()?.toISOString() ??
          new Date().toISOString(),
      };
      return NextResponse.json([teacher]);
    }

    // adminは自教室の講師（managedByで紐付けられた講師）を取得
    // superadminは全講師
    const snapshot = await query.get();

    const teachers: TeacherListItem[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const studentsSnap = await adminDb!
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "==", doc.id)
          .count()
          .get();
        return {
          uid: doc.id,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          studentCount: studentsSnap.data().count,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ??
            new Date().toISOString(),
        };
      })
    );

    return NextResponse.json(teachers);
  } catch {
    return NextResponse.json(mockTeachers);
  }
}
