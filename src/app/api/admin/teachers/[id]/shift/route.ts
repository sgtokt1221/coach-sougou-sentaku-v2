import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { TeacherShift } from "@/lib/types/teacher-shift";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "month パラメータが必要です (例: 2026-04)" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // アクセス権限チェック（自分のシフトまたは管理者権限）
    if (role === "teacher" && id !== uid) {
      return NextResponse.json(
        { error: "他の講師のシフトは閲覧できません" },
        { status: 403 }
      );
    }

    const shiftDoc = await adminDb
      .doc(`users/${id}/shifts/${month}`)
      .get();

    if (!shiftDoc.exists) {
      return NextResponse.json(null);
    }

    const shiftData = shiftDoc.data() as TeacherShift;
    return NextResponse.json(shiftData);
  } catch (error) {
    console.error("Teacher shift fetch error:", error);
    return NextResponse.json(
      { error: "シフトの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // アクセス権限チェック（自分のシフトまたは管理者権限）
    if (role === "teacher" && id !== uid) {
      return NextResponse.json(
        { error: "他の講師のシフトは編集できません" },
        { status: 403 }
      );
    }

    const { month, slots, status } = body;

    if (!month || !Array.isArray(slots) || !status) {
      return NextResponse.json(
        { error: "必要なフィールドが不足しています" },
        { status: 400 }
      );
    }

    // TeacherShiftデータを構築
    const shiftData: TeacherShift = {
      teacherId: id,
      month,
      slots,
      status,
      submittedAt: status === "submitted" ? new Date().toISOString() : undefined,
      confirmedAt: status === "confirmed" ? new Date().toISOString() : undefined,
    };

    // Firestoreに保存
    await adminDb
      .doc(`users/${id}/shifts/${month}`)
      .set(shiftData, { merge: true });

    return NextResponse.json(shiftData);
  } catch (error) {
    console.error("Teacher shift update error:", error);
    return NextResponse.json(
      { error: "シフトの保存に失敗しました" },
      { status: 500 }
    );
  }
}