import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
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
  const authResult = await requireRole(request, ["superadmin"]);
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
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        };
      })
    );

    return NextResponse.json(teachers);
  } catch {
    return NextResponse.json(mockTeachers);
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { email, displayName, password } = body as {
    email: string;
    displayName: string;
    password: string;
  };

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      uid: "mock_new_teacher",
      email,
      displayName,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: "teacher",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "作成に失敗しました" },
      { status: 500 }
    );
  }
}
