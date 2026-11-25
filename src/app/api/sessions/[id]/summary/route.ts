import { NextRequest, NextResponse } from "next/server";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session } from "@/lib/types/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証なしで AI を呼べ、他人の面談に報告書を書き込めた。編集(PATCH)と同じ範囲に限る。
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const ref = adminDb.doc(`sessions/${id}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const denied = await assertSessionAccess(
      adminDb,
      { ...snap.data(), id: snap.id } as Session,
      auth,
    );
    if (denied) return denied;

    const body = await request.json();
    const { notes, type } = body;

    const summary = await generateSessionSummary({ notes, type });

    // 以前はクライアント SDK で書いており、サーバーでは未ログイン扱いで
    // ルールに拒否され、保存されないまま成功を返していた
    await ref.update({ summary, updatedAt: new Date().toISOString() });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Session summary error:", error);
    return NextResponse.json({ error: "報告書の生成に失敗しました" }, { status: 500 });
  }
}
