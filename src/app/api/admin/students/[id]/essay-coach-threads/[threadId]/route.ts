import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { CoachThread } from "@/lib/types/essay-coach";

/**
 * GET /api/admin/students/[id]/essay-coach-threads/[threadId]
 * 単一スレッドの全メッセージと draft スナップショットを返す
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id, threadId } = await params;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // managedBy スコーピング
  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data();
  if (role !== "superadmin" && userData?.managedBy !== uid) {
    return NextResponse.json(
      { error: "この生徒へのアクセス権がありません" },
      { status: 403 }
    );
  }

  try {
    const threadSnap = await adminDb
      .doc(`users/${id}/essayCoachThreads/${threadId}`)
      .get();
    if (!threadSnap.exists) {
      return NextResponse.json(
        { error: "スレッドが見つかりません" },
        { status: 404 }
      );
    }
    const thread = threadSnap.data() as CoachThread;
    return NextResponse.json({ thread });
  } catch (error) {
    console.error("essay-coach-thread detail GET error:", error);
    return NextResponse.json(
      { error: "スレッド詳細の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
