import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await adminDb.doc(`sessions/${id}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const session = { id: snap.id, ...snap.data() } as Session;
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json({ error: "セッションの取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const ref = adminDb.doc(`sessions/${id}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const prevData = snap.data() as Session;
    const updatePayload: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };

    // セッション完了時にサマリーを自動生成
    if (updates.status === "completed" && prevData.status !== "completed") {
      try {
        const summary = await generateSessionSummary({
          notes: prevData.notes,
          type: prevData.type,
        });
        updatePayload.summary = summary;
        updatePayload.sharedWithStudent = true;
      } catch (err) {
        console.warn("Auto summary generation failed:", err);
      }
    }

    await ref.update(updatePayload);
    const updated = await ref.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json({ error: "セッションの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await adminDb.doc(`sessions/${id}`).delete();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "セッションの削除に失敗しました" }, { status: 500 });
  }
}
