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
  {
    uid: "teacher_003",
    displayName: "講師 美咲",
    email: "teacher-misaki@example.com",
    studentCount: 3,
    createdAt: "2026-02-10T00:00:00.000Z",
  },
];

/** 全講師一覧（admin/superadmin用、セッション作成時の講師選択で使用） */
export async function GET(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json(mockTeachers);
  }

  try {
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "teacher")
      .get();

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
