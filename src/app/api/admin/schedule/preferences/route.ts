import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { StudentPreference, TimeSlot } from "@/lib/types/schedule";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "teacher",
  ]);
  if (auth instanceof NextResponse) return auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
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
    return NextResponse.json({ error: "希望時間帯の取得に失敗しました" }, { status: 500 });
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
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
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
