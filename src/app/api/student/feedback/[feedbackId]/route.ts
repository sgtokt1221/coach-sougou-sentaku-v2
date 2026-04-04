import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * PATCH /api/student/feedback/[feedbackId]
 * フィードバックを既読にする
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { feedbackId } = await params;

    if (!adminDb) {
      return NextResponse.json({ success: true, mock: true });
    }

    const docRef = adminDb.doc(`users/${uid}/feedback/${feedbackId}`);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "フィードバックが見つかりません" },
        { status: 404 }
      );
    }

    await docRef.update({ read: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback PATCH error:", error);
    return NextResponse.json(
      { error: "既読処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
