import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 予約送信の一覧・取り消しの権限確認。
 * 送信（POST /api/admin/students/[id]/feedback）と同じ範囲の人だけが触れる。
 */
export async function authorizeScheduledAccess(
  request: NextRequest,
  studentId: string
): Promise<NextResponse | { db: FirebaseFirestore.Firestore }> {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const userDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!userDoc.exists) {
    return NextResponse.json(
      { error: "生徒が見つかりません" },
      { status: 404 }
    );
  }
  const userData = userDoc.data();
  const viewAs = new URL(request.url).searchParams.get("viewAs");
  const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;
  const orgDenied = await scopeByOrganization({
    requesterUid: effectiveUid,
    requesterRole: role,
    studentUid: studentId,
    studentData: {
      managedBy: userData?.managedBy as string | undefined,
      organizationId: userData?.organizationId as string | undefined,
    },
  });
  if (orgDenied) return orgDenied;
  return { db: adminDb };
}
