import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({
      uid: id,
      displayName: "田中 太郎",
      email: "tanaka@example.com",
      role: "student",
      school: "東京都立高校",
      grade: 3,
      managedBy: "admin_001",
      managedByName: "管理者 太郎",
      targetUniversities: ["tokyo-u:law", "kyoto-u:economics"],
      createdAt: "2025-09-15T00:00:00.000Z",
      latestScore: 38,
      essayCount: 5,
    });
  }

  try {
    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const data = studentDoc.data()!;

    // Get manager name
    let managedByName = "";
    if (data.managedBy) {
      const managerDoc = await adminDb.doc(`users/${data.managedBy}`).get();
      managedByName = managerDoc.data()?.displayName ?? "";
    }

    // Get essay count and latest score
    const essaysSnap = await adminDb
      .collection("users")
      .doc(id)
      .collection("essays")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();
    const latestScore = essaysSnap.docs[0]?.data()?.scores?.total ?? null;

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
      grade: data.grade ?? null,
      managedBy: data.managedBy ?? "",
      managedByName,
      targetUniversities: data.targetUniversities ?? [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
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
  if (body.grade !== undefined) updates.grade = body.grade;
  if (body.managedBy !== undefined) updates.managedBy = body.managedBy;
  if (body.targetUniversities !== undefined) updates.targetUniversities = body.targetUniversities;
  updates.updatedAt = new Date();

  if (!adminDb) {
    return NextResponse.json({ success: true, uid: id, ...updates });
  }

  try {
    await adminDb.doc(`users/${id}`).update(updates);
    return NextResponse.json({ success: true, uid: id, ...updates });
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
    return NextResponse.json({ success: true, uid: id, role: "disabled" });
  }

  try {
    await adminDb.doc(`users/${id}`).update({ role: "disabled", updatedAt: new Date() });
    return NextResponse.json({ success: true, uid: id, role: "disabled" });
  } catch {
    return NextResponse.json({ error: "無効化に失敗しました" }, { status: 500 });
  }
}
