import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { StudentPreference, TimeSlot } from "@/lib/types/schedule";

const MOCK_PREFERENCES: StudentPreference[] = [
  {
    studentId: "mock_student_001",
    studentName: "田中 太郎",
    slots: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "10:30" },
      { dayOfWeek: 1, startTime: "10:30", endTime: "11:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "09:30" },
      { dayOfWeek: 5, startTime: "15:00", endTime: "15:30" },
    ],
  },
  {
    studentId: "mock_student_002",
    studentName: "佐藤 花子",
    slots: [
      { dayOfWeek: 2, startTime: "13:00", endTime: "13:30" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "10:30" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "09:30" },
    ],
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "teacher",
  ]);
  if (auth instanceof NextResponse) return auth;

  if (!adminDb) {
    return NextResponse.json(MOCK_PREFERENCES);
  }

  try {
    // Pro生徒のみ取得
    const studentsSnapshot = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("plan", "==", "coach")
      .get();

    const preferences: StudentPreference[] = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const prefDoc = await adminDb
        .doc(`users/${studentDoc.id}/preferredSlots/current`)
        .get();

      preferences.push({
        studentId: studentDoc.id,
        studentName: studentData.displayName || "名前未設定",
        slots: (prefDoc.data()?.slots as TimeSlot[]) || [],
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    return NextResponse.json(MOCK_PREFERENCES);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "student",
  ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { studentId, slots } = (await request.json()) as {
      studentId?: string;
      slots: TimeSlot[];
    };

    const targetId =
      auth.role === "student" ? auth.uid : studentId || auth.uid;

    if (!adminDb) {
      return NextResponse.json({ studentId: targetId, slots });
    }

    await adminDb.doc(`users/${targetId}/preferredSlots/current`).set(
      { slots, updatedAt: new Date() },
      { merge: true }
    );

    return NextResponse.json({ studentId: targetId, slots });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json(
      { error: "希望時間帯の更新に失敗しました" },
      { status: 500 }
    );
  }
}
