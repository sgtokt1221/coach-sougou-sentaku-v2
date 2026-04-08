import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: studentId } = await params;
    const { plan } = await request.json();

    if (plan !== "self" && plan !== "coach") {
      return NextResponse.json(
        { error: "無効なプランです。self または coach を指定してください" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const userRef = adminDb.doc(`users/${studentId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    await userRef.update({
      plan,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      studentId,
      plan,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Plan update failed:", error);
    return NextResponse.json(
      { error: "プランの更新に失敗しました" },
      { status: 500 }
    );
  }
}
