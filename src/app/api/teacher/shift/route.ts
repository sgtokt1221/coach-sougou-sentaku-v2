import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { TeacherShift } from "@/lib/types/teacher-shift";

/**
 * GET /api/teacher/shift?month=2026-04
 * 講師自身のシフト取得
 */
export async function GET(request: Request) {
  const authResult = await requireRole(request, ["teacher"]);
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const month = url.searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "monthパラメータが必要です" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    // 講師は自分のシフトのみアクセス可能
    const snapshot = await adminDb
      .collection("teacherShifts")
      .where("teacherId", "==", authResult.uid)
      .where("month", "==", month)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "シフトが見つかりません" }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const shift: TeacherShift = {
      teacherId: doc.data().teacherId,
      month: doc.data().month,
      slots: doc.data().slots || [],
      submittedAt: doc.data().submittedAt,
      confirmedAt: doc.data().confirmedAt,
      status: doc.data().status || "pending",
    };

    return NextResponse.json(shift);
  } catch (error) {
    console.error("シフト取得エラー:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * PUT /api/teacher/shift
 * 講師自身のシフト更新/作成
 */
export async function PUT(request: Request) {
  const authResult = await requireRole(request, ["teacher"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { month, slots, status } = body;

    if (!month || !Array.isArray(slots)) {
      return NextResponse.json(
        { error: "month と slots が必要です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const teacherId = authResult.uid;

    // 既存のシフトを検索
    const existingSnapshot = await adminDb
      .collection("teacherShifts")
      .where("teacherId", "==", teacherId)
      .where("month", "==", month)
      .limit(1)
      .get();

    const shiftData: Partial<TeacherShift> = {
      teacherId,
      month,
      slots,
      status: status || "pending",
    };

    // 提出時のタイムスタンプ更新
    if (status === "submitted") {
      shiftData.submittedAt = now;
    }

    if (existingSnapshot.empty) {
      // 新規作成
      const docRef = await adminDb.collection("teacherShifts").add(shiftData);
      const newDoc = await docRef.get();

      const result: TeacherShift = {
        teacherId: newDoc.data()!.teacherId,
        month: newDoc.data()!.month,
        slots: newDoc.data()!.slots || [],
        submittedAt: newDoc.data()!.submittedAt,
        confirmedAt: newDoc.data()!.confirmedAt,
        status: newDoc.data()!.status || "pending",
      };

      return NextResponse.json(result);
    } else {
      // 更新
      const docRef = existingSnapshot.docs[0].ref;
      const existingData = existingSnapshot.docs[0].data();

      // 確認済みのシフトは更新不可
      if (existingData.status === "confirmed") {
        return NextResponse.json(
          { error: "確認済みのシフトは更新できません" },
          { status: 400 }
        );
      }

      await docRef.update(shiftData);
      const updatedDoc = await docRef.get();

      const result: TeacherShift = {
        teacherId: updatedDoc.data()!.teacherId,
        month: updatedDoc.data()!.month,
        slots: updatedDoc.data()!.slots || [],
        submittedAt: updatedDoc.data()!.submittedAt,
        confirmedAt: updatedDoc.data()!.confirmedAt,
        status: updatedDoc.data()!.status || "pending",
      };

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("シフト更新エラー:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}