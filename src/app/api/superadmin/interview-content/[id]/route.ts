import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { InterviewContentItem } from "@/lib/types/interview-content";

const COLLECTION = "interviewContent";

/**
 * PATCH: バンク項目の編集 (superadmin 限定)。title/category/description/facultyId を更新。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { id } = await params;
  let body: Partial<InterviewContentItem>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "title は必須です" }, { status: 400 });
    patch.title = t;
  }
  if (body.category !== undefined) patch.category = body.category?.trim() || null;
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.facultyId !== undefined) patch.facultyId = body.facultyId || null;

  await adminDb.doc(`${COLLECTION}/${id}`).set(patch, { merge: true });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE: バンク項目の論理削除 (superadmin 限定)。active:false にする。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { id } = await params;
  await adminDb
    .doc(`${COLLECTION}/${id}`)
    .set({ active: false, updatedAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true });
}
