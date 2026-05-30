import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { EssayDraft } from "@/lib/types/essay";

/**
 * GET /api/student/essay-drafts/[id]
 * 単体の下書き取得（復元用）。
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
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const doc = await adminDb.doc(`users/${uid}/essayDrafts/${id}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 });
    }
    const data = doc.data()!;
    const draft: EssayDraft = {
      id: doc.id,
      directText: data.directText ?? "",
      topic: data.topic ?? "",
      universityId: data.universityId ?? "",
      facultyId: data.facultyId ?? "",
      selectedCompoundId: data.selectedCompoundId ?? "",
      customMaxLength: data.customMaxLength,
      writingDirection: data.writingDirection,
      inputMode: "text",
      universityName: data.universityName ?? "",
      facultyName: data.facultyName ?? "",
      themeId: data.themeId,
      pastQuestionId: data.pastQuestionId,
      homeworkId: data.homeworkId,
      createdAt:
        data.createdAt?.toDate?.()?.toISOString() ??
        (typeof data.createdAt === "string" ? data.createdAt : ""),
      updatedAt:
        data.updatedAt?.toDate?.()?.toISOString() ??
        (typeof data.updatedAt === "string" ? data.updatedAt : ""),
    };
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Essay draft GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * DELETE /api/student/essay-drafts/[id]
 * 下書き削除（本人のみ）。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    await adminDb.doc(`users/${uid}/essayDrafts/${id}`).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Essay draft DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
