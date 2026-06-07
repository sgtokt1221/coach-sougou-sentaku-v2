import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { ResearchCurriculum } from "@/lib/types/research";

/**
 * GET /api/admin/students/[id]/research-curriculum
 * 指定生徒の探究カリキュラム(全体)を読み取り返す。講師は担当生徒のみ閲覧可。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data();

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) return orgDenied;

    const snap = await adminDb.doc(`users/${id}/researchCurriculum/current`).get();
    return NextResponse.json(snap.exists ? (snap.data() as ResearchCurriculum) : null);
  } catch (error) {
    console.error("Admin research curriculum GET error:", error);
    return NextResponse.json(
      { error: "カリキュラムの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
