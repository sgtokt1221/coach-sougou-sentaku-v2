import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import type {
  CoachThread,
  CoachThreadSummary,
} from "@/lib/types/essay-coach";

/**
 * GET /api/admin/students/[id]/essay-coach-threads
 * 指定生徒の AIコーチスレッド一覧 (messages を除く軽量サマリ)
 * admin/teacher は担当生徒のみ、superadmin は全員
 */
export async function GET(
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

  const { id } = await params;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // managedBy スコーピング
  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data();
  const orgDenied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid: id,
    studentData: {
      managedBy: userData?.managedBy as string | undefined,
      organizationId: userData?.organizationId as string | undefined,
    },
  });
  if (orgDenied) return orgDenied;

  try {
    const snap = await adminDb
      .collection(`users/${id}/essayCoachThreads`)
      .orderBy("updatedAt", "desc")
      .get();

    const threads: CoachThreadSummary[] = snap.docs.map((d) => {
      const data = d.data() as CoachThread;
      return {
        id: d.id,
        topic: data.topic ?? "",
        universityId: data.universityId,
        facultyId: data.facultyId,
        universityName: data.universityName,
        facultyName: data.facultyName,
        messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
        draftLength: data.draftLength ?? 0,
        createdAt: data.createdAt ?? "",
        updatedAt: data.updatedAt ?? "",
      };
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("essay-coach-threads GET error:", error);
    return NextResponse.json(
      { error: "AIコーチ履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
