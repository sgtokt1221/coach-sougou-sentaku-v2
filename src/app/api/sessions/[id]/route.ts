import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";
import { requireRole } from "@/lib/api/auth";
import { sanitizeForStudent } from "@/lib/api/session-sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

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

    // 生徒は自分のセッションのみ。講師専用フィールドと未共有 summary は除去して返す。
    if (role === "student") {
      if (session.studentId !== uid && session.teacherId !== uid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
      return NextResponse.json(sanitizeForStudent(session));
    }

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
        // 自動公開はしない。講師がレビュー後「報告書を共有」を押して公開する。
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
