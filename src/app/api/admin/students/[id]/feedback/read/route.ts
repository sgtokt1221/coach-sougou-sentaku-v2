import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { resetUnread } from "@/lib/chat/conversation";

/**
 * POST /api/admin/students/[id]/feedback/read
 * コーチがスレッドを開いた時に unreadByCoach を 0 にする。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
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
      },
    });
    if (orgDenied) return orgDenied;

    await resetUnread(id, "coach");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coach feedback read error:", error);
    return NextResponse.json({ error: "既読処理に失敗しました" }, { status: 500 });
  }
}
