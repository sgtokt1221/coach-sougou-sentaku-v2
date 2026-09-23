import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { loadAiConversations } from "@/lib/admin/ai-conversations";

/**
 * GET /api/admin/students/[id]/ai-conversations
 *
 * その生徒とAIのやり取りを、機能をまたいで1本の時系列にして返す。
 * 組み立ては src/lib/admin/ai-conversations.ts（生徒詳細の時系列と共用）。
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data();
  const denied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid: id,
    studentData: {
      managedBy: userData?.managedBy as string | undefined,
      organizationId: userData?.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(userData),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  const items = await loadAiConversations(adminDb, id);

  return NextResponse.json({ conversations: items });
}
