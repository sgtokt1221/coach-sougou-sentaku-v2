import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/admin/students/[id]/assign-teacher
 * 生徒に担当講師(assignedTeacherId)を割り当てる/解除する。
 * body: { teacherId: string | null }
 * - caller(admin/superadmin) がその生徒を管理していること
 * - 割り当てる teacher が caller 配下(managedBy)/同org/ superadmin であること
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body = (await request.json()) as { teacherId?: string | null };
    const teacherId = body.teacherId ?? null;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (!studentDoc.exists || studentDoc.data()?.role !== "student") {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const studentData = studentDoc.data();

    // 生徒の管理権限チェック
    const denied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: studentData?.managedBy as string | undefined,
        organizationId: studentData?.organizationId as string | undefined,
      },
    });
    if (denied) return denied;

    // 割り当て解除
    if (!teacherId) {
      await adminDb.doc(`users/${id}`).update({
        assignedTeacherId: FieldValue.delete(),
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, assignedTeacherId: null });
    }

    // 講師の妥当性チェック
    const teacherDoc = await adminDb.doc(`users/${teacherId}`).get();
    if (!teacherDoc.exists || teacherDoc.data()?.role !== "teacher") {
      return NextResponse.json(
        { error: "指定された講師が見つかりません" },
        { status: 400 }
      );
    }
    const teacherData = teacherDoc.data();
    if (role !== "superadmin") {
      const callerDoc = await adminDb.doc(`users/${uid}`).get();
      const callerOrg = callerDoc.data()?.organizationId as string | undefined;
      const okManaged = teacherData?.managedBy === uid;
      const okOrg =
        callerOrg && teacherData?.organizationId === callerOrg;
      if (!okManaged && !okOrg) {
        return NextResponse.json(
          { error: "この講師を割り当てる権限がありません" },
          { status: 403 }
        );
      }
    }

    await adminDb.doc(`users/${id}`).update({
      assignedTeacherId: teacherId,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, assignedTeacherId: teacherId });
  } catch (error) {
    console.error("assign-teacher POST error:", error);
    return NextResponse.json(
      { error: "担当講師の割り当て中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
