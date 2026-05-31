import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/admin/students/[id]/assign-teacher
 * 生徒の担当講師(assignedTeacherIds 配列)に teacher を追加/解除する。
 * body: { teacherId: string, assigned: boolean }  (assigned 省略時は true=追加)
 * - caller(admin/superadmin) がその生徒を管理していること
 * - 追加する teacher が caller 配下(managedBy)/同org/ superadmin であること
 * 1生徒を複数講師が担当できる。
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
    const body = (await request.json()) as {
      teacherId?: string | null;
      assigned?: boolean;
    };
    const teacherId = body.teacherId ?? null;
    const assigned = body.assigned ?? true;

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId が必要です" },
        { status: 400 }
      );
    }

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

    const current = getAssignedTeacherIds(studentData);
    let next: string[];

    if (assigned) {
      // 講師の妥当性チェック (追加時のみ)
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
        const okOrg = callerOrg && teacherData?.organizationId === callerOrg;
        if (!okManaged && !okOrg) {
          return NextResponse.json(
            { error: "この講師を割り当てる権限がありません" },
            { status: 403 }
          );
        }
      }
      next = Array.from(new Set([...current, teacherId]));
    } else {
      next = current.filter((t) => t !== teacherId);
    }

    // 配列を更新し、旧 単一フィールドは削除して完全移行する
    await adminDb.doc(`users/${id}`).update({
      assignedTeacherIds: next,
      assignedTeacherId: FieldValue.delete(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, assignedTeacherIds: next });
  } catch (error) {
    console.error("assign-teacher POST error:", error);
    return NextResponse.json(
      { error: "担当講師の割り当て中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
