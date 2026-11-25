import { disableStudentAccount } from "@/lib/api/account-disable";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { orgFieldsFollowingManager } from "@/lib/api/organization-scope";
import { normalizedEssayTotal } from "@/lib/types/essay";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const data = studentDoc.data()!;

    // Get manager name
    let managedByName = "";
    if (data.managedBy) {
      const managerDoc = await adminDb.doc(`users/${data.managedBy}`).get();
      managedByName = managerDoc.data()?.displayName ?? "";
    }

    // Get organization name
    const orgId =
      typeof data.organizationId === "string" ? data.organizationId : undefined;
    let organizationName: string | undefined;
    if (orgId) {
      const orgDoc = await adminDb.doc(`organizations/${orgId}`).get();
      if (orgDoc.exists) organizationName = orgDoc.data()?.name ?? undefined;
    }

    // Get essay count and latest score
    const essaysSnap = await adminDb
      .collection("users")
      .doc(id)
      .collection("essays")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();
    const latestEssay = essaysSnap.docs[0]?.data();
    const latestScore =
      typeof latestEssay?.scores?.total === "number"
        ? normalizedEssayTotal(
            latestEssay.scores.total,
            latestEssay.feedback?.scoreMaximum
          )
        : null;

    const essayCountSnap = await adminDb
      .collection("users")
      .doc(id)
      .collection("essays")
      .count()
      .get();

    return NextResponse.json({
      uid: id,
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      role: data.role,
      school: data.school ?? "",
      schoolId: data.schoolId,
      grade: data.grade ?? null,
      managedBy: data.managedBy ?? "",
      managedByName,
      organizationId: orgId,
      organizationName,
      targetUniversities: data.targetUniversities ?? [],
      createdAt:
        data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      latestScore,
      essayCount: essayCountSnap.data().count,
    });
  } catch {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.displayName !== undefined) updates.displayName = body.displayName;
  if (body.school !== undefined) updates.school = body.school;
  if (body.schoolId !== undefined) updates.schoolId = body.schoolId;
  if (body.grade !== undefined) updates.grade = body.grade;
  if (body.targetUniversities !== undefined)
    updates.targetUniversities = body.targetUniversities;
  updates.updatedAt = new Date();

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // managedBy 変更時は所属も担当者に追従させる。以前は担当者が管理者以外・所属無し・
  // 担当を外したときに organizationId が古いまま残り、元の塾から見え続けた
  if (body.managedBy !== undefined) {
    updates.managedBy = body.managedBy;
    Object.assign(updates, await orgFieldsFollowingManager(adminDb, body.managedBy));
  }

  try {
    await adminDb.doc(`users/${id}`).update(updates);
    // 所属を消したときの FieldValue.delete() は応答に載せず null で返す
    const res: Record<string, unknown> = { success: true, uid: id, ...updates };
    if ("organizationId" in updates && typeof updates.organizationId !== "string") {
      res.organizationId = null;
    }
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await disableStudentAccount(id);
    return NextResponse.json({ success: true, uid: id, role: "disabled" });
  } catch {
    return NextResponse.json(
      { error: "無効化に失敗しました" },
      { status: 500 }
    );
  }
}
