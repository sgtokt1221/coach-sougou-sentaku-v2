import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
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

  const scopeDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!scopeDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const denied = await scopeByOrganization({
    requesterUid,
    requesterRole: role,
    studentUid: studentId,
    studentData: {
      managedBy: scopeDoc.data()?.managedBy,
      organizationId: scopeDoc.data()?.organizationId,
      assignedTeacherIds: getAssignedTeacherIds(scopeDoc.data()),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

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
