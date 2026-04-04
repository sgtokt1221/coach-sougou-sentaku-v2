import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminFeedback } from "@/lib/types/feedback";

const MOCK_FEEDBACKS: AdminFeedback[] = [
  {
    id: "fb_001",
    type: "essay",
    targetId: "essay_001",
    targetLabel: "小論文 #1: 社会問題について",
    message: "論理展開が良くなっています。次回は具体例をもう少し増やしてみましょう。",
    createdBy: "admin_001",
    createdByName: "田中先生",
    createdAt: "2026-03-28T10:00:00Z",
    read: false,
  },
  {
    id: "fb_002",
    type: "general",
    targetId: "",
    targetLabel: "全般",
    message: "志望理由書の提出期限が近づいています。早めに取り掛かりましょう。",
    createdBy: "admin_001",
    createdByName: "田中先生",
    createdAt: "2026-03-25T14:30:00Z",
    read: true,
  },
];

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
      if (countOnly) {
        const unreadCount = MOCK_FEEDBACKS.filter((f) => !f.read).length;
        return NextResponse.json({ unreadCount });
      }
      return NextResponse.json(MOCK_FEEDBACKS);
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
