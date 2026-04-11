/**
 * 管理者が個別生徒の自己分析 (Discover) を閲覧するための API。
 * admin/teacher/superadmin に限定、managedBy スコーピング (teacher は session-access 経由も許容)。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
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

  // managedBy スコーピング
  if (role !== "superadmin") {
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    const userData = studentDoc.data();
    if (!studentDoc.exists || userData?.managedBy !== callerUid) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(callerUid, studentId);
        if (!hasAccess) {
          return NextResponse.json({ error: "権限がありません" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }
  }

  const doc = await adminDb.doc(`selfAnalysis/${studentId}`).get();
  if (!doc.exists) {
    return NextResponse.json(null);
  }
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
