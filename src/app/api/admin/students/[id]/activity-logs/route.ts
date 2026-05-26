import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 生徒のネタインプット・面接ドリル等のアクティビティログを返す
 * GET /api/admin/students/[id]/activity-logs
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  if (!adminDb) return NextResponse.json([], { status: 200 });

  // スコープチェック: 自分の管轄 or 同じ塾の admin のみ
  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data() ?? {};
  const denied = await scopeByOrganization({
    requesterUid: authResult.uid,
    requesterRole: authResult.role,
    studentUid: id,
    studentData: {
      managedBy: userData.managedBy as string | undefined,
      organizationId: userData.organizationId as string | undefined,
    },
  });
  if (denied) return denied;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const snap = await adminDb
      .collection(`users/${id}/activityLogs`)
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));

    const logs = snap.docs.map((d) => {
      const data = d.data();
      return {
        type: data.type as string,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        metadata: data.metadata ?? {},
      };
    }).filter((l) => l.createdAt);

    return NextResponse.json(logs);
  } catch (err) {
    console.error("[admin/activity-logs] error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
