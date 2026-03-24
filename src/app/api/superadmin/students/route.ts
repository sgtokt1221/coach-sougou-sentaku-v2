import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const mockStudents = [
  {
    uid: "mock_student_001",
    displayName: "田中 太郎",
    email: "tanaka@example.com",
    school: "東京都立高校",
    grade: 3,
    managedBy: "admin_001",
    managedByName: "管理者 太郎",
    createdAt: "2025-09-15T00:00:00.000Z",
  },
  {
    uid: "mock_student_002",
    displayName: "佐藤 花子",
    email: "sato@example.com",
    school: "私立高校",
    grade: 3,
    managedBy: "admin_002",
    managedByName: "講師 花子",
    createdAt: "2025-10-01T00:00:00.000Z",
  },
  {
    uid: "mock_student_003",
    displayName: "鈴木 一郎",
    email: "suzuki@example.com",
    school: "県立高校",
    grade: 2,
    managedBy: "",
    managedByName: "",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
];

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json(mockStudents);
  }

  try {
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .get();

    // Get admin names for display
    const adminIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const managedBy = doc.data().managedBy;
      if (managedBy) adminIds.add(managedBy);
    });

    const adminNames = new Map<string, string>();
    if (adminIds.size > 0) {
      const adminSnap = await adminDb
        .collection("users")
        .where("role", "in", ["admin", "teacher"])
        .get();
      adminSnap.docs.forEach((doc) => {
        adminNames.set(doc.id, doc.data().displayName ?? "");
      });
    }

    const students = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName ?? "",
        email: data.email ?? "",
        school: data.school ?? "",
        grade: data.grade ?? null,
        managedBy: data.managedBy ?? "",
        managedByName: data.managedBy ? (adminNames.get(data.managedBy) ?? "") : "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(students);
  } catch {
    return NextResponse.json(mockStudents);
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { email, displayName, password, school, grade, managedBy } = body as {
    email: string;
    displayName: string;
    password: string;
    school?: string;
    grade?: number;
    managedBy?: string;
  };

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      uid: "mock_new_student",
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      managedBy: managedBy ?? "",
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
      role: "student",
      school: school ?? "",
      grade: grade ?? null,
      managedBy: managedBy ?? "",
      targetUniversities: [],
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      managedBy: managedBy ?? "",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "作成に失敗しました" },
      { status: 500 }
    );
  }
}
