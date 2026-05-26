import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * PATCH /api/admin/students/[id]/homework/[hwId]
 *
 * 講師が宿題を「確認済みにする」「コメントを書く」操作用。
 * Body: { status?: "reviewed", reviewComment?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hwId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore に接続できません" },
      { status: 500 },
    );
  }

  try {
    const { id: studentId, hwId } = await params;

    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    const body = (await request.json()) as {
      status?: "reviewed";
      reviewComment?: string;
    };

    const hwRef = adminDb.doc(`users/${studentId}/homeworkAssignments/${hwId}`);
    const hwSnap = await hwRef.get();
    if (!hwSnap.exists) {
      return NextResponse.json(
        { error: "宿題が見つかりません" },
        { status: 404 },
      );
    }
    const current = hwSnap.data() as { status: string };

    const update: Record<string, unknown> = {};
    if (body.status === "reviewed") {
      if (current.status !== "submitted") {
        return NextResponse.json(
          { error: "提出済 (submitted) でない宿題は確認済みにできません" },
          { status: 400 },
        );
      }
      update.status = "reviewed";
      update.reviewedAt = FieldValue.serverTimestamp();
      update.reviewedBy = uid;
    }
    if (typeof body.reviewComment === "string") {
      update.reviewComment = body.reviewComment;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "更新内容が指定されていません" },
        { status: 400 },
      );
    }

    await hwRef.update(update);
    const updated = await hwRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("[admin/students/homework PATCH] error:", error);
    return NextResponse.json(
      {
        error: "宿題の更新に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
