import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Assignment } from "@/lib/types/schedule";

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "assign_001",
    teacherId: "teacher_001",
    teacherName: "山田 先生",
    studentId: "mock_student_001",
    studentName: "田中 太郎",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "10:30",
    createdAt: new Date(),
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "teacher",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");

  if (!adminDb) {
    let filtered = MOCK_ASSIGNMENTS;
    if (teacherId)
      filtered = filtered.filter((a) => a.teacherId === teacherId);
    if (studentId)
      filtered = filtered.filter((a) => a.studentId === studentId);
    return NextResponse.json(filtered);
  }

  try {
    let query = adminDb.collection("assignments").orderBy("createdAt", "desc");

    if (teacherId) {
      query = query.where("teacherId", "==", teacherId) as typeof query;
    }
    if (studentId) {
      query = query.where("studentId", "==", studentId) as typeof query;
    }

    const snapshot = await query.get();
    const assignments: Assignment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Assignment[];

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json(MOCK_ASSIGNMENTS);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Omit<Assignment, "id" | "createdAt">;

    if (!adminDb) {
      const newAssignment: Assignment = {
        ...body,
        id: `assign_${Date.now()}`,
        createdAt: new Date(),
      };
      return NextResponse.json(newAssignment, { status: 201 });
    }

    const docRef = await adminDb.collection("assignments").add({
      ...body,
      createdAt: new Date(),
    });

    const newAssignment: Assignment = {
      ...body,
      id: docRef.id,
      createdAt: new Date(),
    };

    return NextResponse.json(newAssignment, { status: 201 });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json(
      { error: "アサインの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "アサインIDが必要です" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ deleted: true, id });
  }

  try {
    await adminDb.doc(`assignments/${id}`).delete();
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json(
      { error: "アサインの削除に失敗しました" },
      { status: 500 }
    );
  }
}
