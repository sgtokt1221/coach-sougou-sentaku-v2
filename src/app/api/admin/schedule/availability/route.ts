import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { TeacherAvailability, TimeSlot } from "@/lib/types/schedule";

const MOCK_AVAILABILITY: TeacherAvailability[] = [
  {
    teacherId: "teacher_001",
    teacherName: "山田 先生",
    slots: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "10:30" },
      { dayOfWeek: 1, startTime: "10:30", endTime: "11:00" },
      { dayOfWeek: 1, startTime: "14:00", endTime: "14:30" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "09:30" },
      { dayOfWeek: 3, startTime: "09:30", endTime: "10:00" },
      { dayOfWeek: 5, startTime: "15:00", endTime: "15:30" },
      { dayOfWeek: 5, startTime: "15:30", endTime: "16:00" },
    ],
  },
  {
    teacherId: "teacher_002",
    teacherName: "鈴木 先生",
    slots: [
      { dayOfWeek: 2, startTime: "13:00", endTime: "13:30" },
      { dayOfWeek: 2, startTime: "13:30", endTime: "14:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "10:30" },
      { dayOfWeek: 4, startTime: "10:30", endTime: "11:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "09:30" },
      { dayOfWeek: 6, startTime: "09:30", endTime: "10:00" },
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
    return NextResponse.json(MOCK_AVAILABILITY);
  }

  try {
    const teachersSnapshot = await adminDb
      .collection("users")
      .where("role", "==", "teacher")
      .get();

    const availability: TeacherAvailability[] = [];

    for (const teacherDoc of teachersSnapshot.docs) {
      const teacherData = teacherDoc.data();
      const availDoc = await adminDb
        .doc(`users/${teacherDoc.id}/availability/current`)
        .get();

      availability.push({
        teacherId: teacherDoc.id,
        teacherName: teacherData.displayName || "名前未設定",
        slots: (availDoc.data()?.slots as TimeSlot[]) || [],
      });
    }

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(MOCK_AVAILABILITY);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "teacher",
  ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { teacherId, slots } = (await request.json()) as {
      teacherId?: string;
      slots: TimeSlot[];
    };

    // 講師は自分のみ、admin/superadminは任意の講師を更新可能
    const targetId =
      auth.role === "teacher" ? auth.uid : teacherId || auth.uid;

    if (!adminDb) {
      return NextResponse.json({ teacherId: targetId, slots });
    }

    await adminDb.doc(`users/${targetId}/availability/current`).set(
      { slots, updatedAt: new Date() },
      { merge: true }
    );

    return NextResponse.json({ teacherId: targetId, slots });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json(
      { error: "空きコマの更新に失敗しました" },
      { status: 500 }
    );
  }
}
