import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";

/**
 * GET /api/interview/[id]
 *
 * 面接の記録（会話全文・採点・フィードバック）を返す。
 * 認証なしで返していたため、IDを知っていれば他人の面接を全部読めた。
 * 本人か、担当する管理者・講師だけに限る。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        const interviewDoc = await adminDb.doc(`interviews/${id}`).get();
        if (interviewDoc.exists) {
          const data = interviewDoc.data()!;
          const isOwner =
            (!!data.userId && data.userId === uid) || uid === "dev-user";
          if (!isOwner) {
            // 職員なら他塾の面接も読めた。担当範囲（scopeByOrganization）に限る。
            // 持ち主の無い回（本番 0 件）は本部だけ。
            let denied: NextResponse | null =
              role === "superadmin"
                ? null
                : NextResponse.json({ error: "権限がありません" }, { status: 403 });
            if (role !== "student" && role !== "superadmin" && data.userId) {
              const studentSnap = await adminDb.doc(`users/${data.userId}`).get();
              const sd = studentSnap.data() ?? {};
              denied = await scopeByOrganization({
                requesterUid: uid,
                requesterRole: role,
                studentUid: data.userId,
                studentData: {
                  managedBy: sd.managedBy,
                  organizationId: sd.organizationId,
                  assignedTeacherIds: getAssignedTeacherIds(sd),
                },
                allowAssignedTeacher: true,
              });
            }
            if (denied) return denied;
          }
          return NextResponse.json({ id: interviewDoc.id, ...data });
        }
      } catch (err) {
        console.warn("Failed to fetch interview from Firestore:", err);
      }
    }

    return NextResponse.json(
      { error: "面接データが見つかりません" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json(
      { error: "面接データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/interview/[id]
 * 進行中の面接を破棄する（本人のみ）。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { id } = await params;
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }
    const doc = await adminDb.doc(`interviews/${id}`).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "面接が見つかりません" },
        { status: 404 }
      );
    }
    const data = doc.data()!;
    if (data.userId && uid !== "dev-user" && data.userId !== uid) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    await adminDb.doc(`interviews/${id}`).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Interview DELETE error:", error);
    return NextResponse.json({ error: "破棄に失敗しました" }, { status: 500 });
  }
}
