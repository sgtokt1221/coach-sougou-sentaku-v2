import { NextRequest, NextResponse } from "next/server";
import type { Essay } from "@/lib/types/essay";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDKが初期化されていません" },
        { status: 500 }
      );
    }

    const essayDoc = await adminDb.doc(`essays/${id}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json({ error: "小論文が見つかりません" }, { status: 404 });
    }

    const data = essayDoc.data()!;
    const essay: Essay = {
      id: essayDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      ocrText: data.ocrText,
      targetUniversity: data.targetUniversity,
      targetFaculty: data.targetFaculty,
      topic: data.topic,
      submittedAt: data.submittedAt?.toDate() ?? new Date(),
      scores: data.scores,
      feedback: data.feedback,
      status: data.status,
    };

    return NextResponse.json(essay);
  } catch (error) {
    console.error("Essay get error:", error);
    return NextResponse.json(
      { error: "取得処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
