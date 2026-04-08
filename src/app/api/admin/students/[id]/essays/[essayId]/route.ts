import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Essay } from "@/lib/types/essay";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { id: studentId, essayId } = await params;

  if (!adminDb) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  try {
    const essayDoc = await adminDb.doc(`essays/${essayId}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json(
        { error: "エッセイが見つかりません" },
        { status: 404 }
      );
    }

    const data = essayDoc.data()!;

    // userId が対象生徒と一致することを確認
    if (data.userId !== studentId) {
      return NextResponse.json(
        { error: "この生徒のエッセイではありません" },
        { status: 403 }
      );
    }

    const essay: Essay = {
      id: essayDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl || "",
      ocrText: data.ocrText || "",
      targetUniversity: data.targetUniversity || "",
      targetFaculty: data.targetFaculty || "",
      topic: data.topic,
      submittedAt: data.submittedAt?.toDate() || new Date(),
      status: data.status || "uploaded",
      scores: data.scores || undefined,
      feedback: data.feedback || undefined,
    };

    return NextResponse.json(essay);
  } catch (error) {
    console.error("Failed to fetch essay:", error);
    return NextResponse.json(
      { error: "エッセイの取得に失敗しました" },
      { status: 500 }
    );
  }
}
