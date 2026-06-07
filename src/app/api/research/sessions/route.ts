import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * GET /api/research/sessions
 * 自分の探究セッション履歴（新しい順）。前回の「次回やること」表示や連続性に使う。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("researchSessions")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const sessions = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        topic: data.topic ?? "",
        feedback: data.feedback ?? null,
        nextItems: data.nextItems ?? [],
        sessionId: data.sessionId ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Research sessions GET error:", error);
    return NextResponse.json(
      { error: "セッション履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
