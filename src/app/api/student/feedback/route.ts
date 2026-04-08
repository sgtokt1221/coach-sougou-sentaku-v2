import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminFeedback } from "@/lib/types/feedback";

/**
 * GET /api/student/feedback
 * 自分のフィードバック一覧を取得
 * ?countOnly=true の場合は未読件数のみ返す
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    if (countOnly) {
      const unreadSnap = await adminDb
        .collection(`users/${uid}/feedback`)
        .where("read", "==", false)
        .get();
      return NextResponse.json({ unreadCount: unreadSnap.size });
    }

    const snap = await adminDb
      .collection(`users/${uid}/feedback`)
      .orderBy("createdAt", "desc")
      .get();

    const feedbacks: AdminFeedback[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type ?? "general",
        targetId: data.targetId ?? "",
        targetLabel: data.targetLabel ?? "",
        message: data.message ?? "",
        createdBy: data.createdBy ?? "",
        createdByName: data.createdByName ?? "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        read: data.read ?? false,
      };
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("Student feedback GET error:", error);
    return NextResponse.json(
      { error: "フィードバックの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
