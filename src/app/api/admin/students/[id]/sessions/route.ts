import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/admin/students/[id]/sessions
 * 指定生徒のセッション一覧 (新しい順、limit 10)
 * admin/teacher は担当 (managedBy === uid) のみ、superadmin は全員可
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 組織スコーピング（自塾の admin は代行可、担当講師も許可）
  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const denied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid: id,
    studentData: {
      managedBy: userDoc.data()?.managedBy,
      organizationId: userDoc.data()?.organizationId,
      assignedTeacherIds: getAssignedTeacherIds(userDoc.data()),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
  );

  try {
    const snap = await adminDb
      .collection("sessions")
      .where("studentId", "==", id)
      .orderBy("scheduledAt", "desc")
      .limit(limit)
      .get();
    const sessions: Session[] = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Session,
    );
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[students/[id]/sessions] error:", err);
    return NextResponse.json(
      { error: "セッション履歴の取得に失敗しました" },
      { status: 500 },
    );
  }
}
