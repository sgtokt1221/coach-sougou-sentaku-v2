/**
 * 管理者が個別生徒の自己分析 (Discover) を閲覧するための API。
 * admin/teacher/superadmin に限定、managedBy スコーピング (teacher は session-access 経由も許容)。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;

  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // スコープ判定: superadmin / 自分の管轄 / 同じ塾の admin / teacher session
  {
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = studentDoc.data();
    const orgDenied = await scopeByOrganization({
      requesterUid: callerUid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(callerUid, studentId);
        if (!hasAccess) return orgDenied;
      } else {
        return orgDenied;
      }
    }
  }

  const doc = await adminDb.doc(`selfAnalysis/${studentId}`).get();
  if (!doc.exists) {
    return NextResponse.json(null);
  }
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
