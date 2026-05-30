import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { InterviewMessage } from "@/lib/types/interview";

/** 進行中面接の所有者を検証し doc data を返す（無ければ null） */
async function loadOwned(id: string, uid: string) {
  if (!adminDb) return { error: "サーバー設定エラー" as const, status: 500 };
  const doc = await adminDb.doc(`interviews/${id}`).get();
  if (!doc.exists) return { error: "面接が見つかりません" as const, status: 404 };
  const data = doc.data()!;
  // dev-user は検証を緩める（dev フォールバック）。本番は userId 一致必須。
  if (data.userId && uid !== "dev-user" && data.userId !== uid) {
    return { error: "権限がありません" as const, status: 403 };
  }
  return { data };
}

/**
 * POST /api/interview/[id]/messages
 * 会話中の messages を Firestore に自動保存（再開用）。status は変更しない。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const raw: InterviewMessage[] = Array.isArray(body.messages) ? body.messages : [];

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const owned = await loadOwned(id, uid);
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
    // 採点済み（完了）には上書きしない
    if (owned.data.status === "completed") {
      return NextResponse.json({ ok: false, reason: "completed" });
    }

    const messages = raw
      .filter((m) => !m.isThinking && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.doc(`interviews/${id}`).update({
      messages,
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, count: messages.length });
  } catch (error) {
    console.error("Interview messages POST error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

/**
 * GET /api/interview/[id]/messages
 * 再開のためのセッション情報＋messages を認証付きで返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { id } = await params;
    const owned = await loadOwned(id, uid);
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
    const d = owned.data;
    return NextResponse.json({
      id,
      status: d.status ?? "in_progress",
      mode: d.mode ?? "individual",
      inputMode: d.inputMode ?? "text",
      universityId: d.universityId ?? "",
      facultyId: d.facultyId ?? "",
      universityContext: d.universityContext ?? null,
      openingMessage: d.openingMessage ?? "",
      messages: Array.isArray(d.messages) ? d.messages : [],
    });
  } catch (error) {
    console.error("Interview messages GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
