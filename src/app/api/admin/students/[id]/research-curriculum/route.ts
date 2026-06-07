import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { ResearchCurriculum } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

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

/**
 * PATCH /api/admin/students/[id]/research-curriculum
 * 講師が生徒のカリキュラム(各回・回数等)を編集する。講師は担当生徒のみ。
 */
export async function PATCH(
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

    const ref = adminDb.doc(`users/${id}/researchCurriculum/current`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "カリキュラムがありません" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<ResearchCurriculum>;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (Array.isArray(body.units)) updates.units = body.units;
    if (typeof body.totalUnits === "number") {
      updates.totalUnits = Math.min(RESEARCH_MAX_UNITS, Math.max(1, Math.round(body.totalUnits)));
    }
    if (typeof body.domain === "string") updates.domain = body.domain;
    if (typeof body.theme === "string") updates.theme = body.theme;
    if (typeof body.goal === "string") updates.goal = body.goal;
    if (body.status === "draft" || body.status === "active") updates.status = body.status;

    await ref.set(updates, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(updated.data() as ResearchCurriculum);
  } catch (error) {
    console.error("Admin research curriculum PATCH error:", error);
    return NextResponse.json(
      { error: "カリキュラムの更新に失敗しました" },
      { status: 500 }
    );
  }
}
