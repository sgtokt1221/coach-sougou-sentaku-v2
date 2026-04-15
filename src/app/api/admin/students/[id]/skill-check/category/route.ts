import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { ACADEMIC_CATEGORIES, type AcademicCategory } from "@/lib/types/skill-check";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid: requesterUid, role } = auth;
  const { id: studentId } = await context.params;

  let body: { category?: AcademicCategory };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }
  const { category } = body;
  if (!category || !ACADEMIC_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "無効な系統" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json({ ok: true });

  if (role !== "superadmin") {
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists || studentDoc.data()?.managedBy !== requesterUid) {
      return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
    }
  }

  try {
    await adminDb.doc(`users/${studentId}`).set(
      { academicCategory: category },
      { merge: true },
    );
    return NextResponse.json({ ok: true, category });
  } catch (err) {
    console.warn("admin category update failed:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
