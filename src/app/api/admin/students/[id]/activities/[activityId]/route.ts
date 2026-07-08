import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { Activity } from "@/lib/types/activity";

/**
 * GET /api/admin/students/[id]/activities/[activityId]
 * 管理者/講師が生徒の活動実績 1 件の詳細を取得する。
 * セッション画面のダイアログ表示で利用（録音中にページ遷移しないため）。
 * 認可: superadmin 以外は managedBy or 担当講師(assignedTeacherIds)。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, activityId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const denied = await scopeByOrganization({
      requesterUid: callerUid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: studentDoc.data()?.managedBy,
        organizationId: studentDoc.data()?.organizationId,
        assignedTeacherIds: getAssignedTeacherIds(studentDoc.data()),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;

    const docRef = await adminDb
      .doc(`users/${studentId}/activities/${activityId}`)
      .get();
    if (!docRef.exists) {
      return NextResponse.json({ error: "活動が見つかりません" }, { status: 404 });
    }

    const data = docRef.data()!;
    const toIso = (v: unknown): string =>
      (v as { toDate?: () => Date })?.toDate?.()?.toISOString() ??
      (typeof v === "string" ? v : "");

    const activity: Activity = {
      id: docRef.id,
      userId: data.userId ?? studentId,
      title: data.title ?? "",
      category: data.category ?? "other",
      period: data.period ?? { start: "", end: "" },
      description: data.description ?? "",
      structuredData: data.structuredData ?? undefined,
      optimizations: Array.isArray(data.optimizations) ? data.optimizations : [],
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Admin activity detail error:", error);
    return NextResponse.json(
      { error: "活動詳細の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
