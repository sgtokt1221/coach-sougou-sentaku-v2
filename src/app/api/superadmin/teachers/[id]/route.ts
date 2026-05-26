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
      displayName: "講師 花子",
      email: "teacher-hanako@example.com",
      role: "teacher",
      createdAt: "2025-10-15T00:00:00.000Z",
      students: [
        { uid: "s1", displayName: "田中 太郎", email: "tanaka@example.com" },
        { uid: "s2", displayName: "佐藤 花子", email: "sato@example.com" },
      ],
    });
  }

  try {
    const teacherDoc = await adminDb.doc(`users/${id}`).get();
    if (!teacherDoc.exists) {
      return NextResponse.json({ error: "講師が見つかりません" }, { status: 404 });
    }

    const data = teacherDoc.data()!;
    const studentsSnap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("managedBy", "==", id)
      .get();

    const students = studentsSnap.docs.map((doc) => ({
      uid: doc.id,
      displayName: doc.data().displayName ?? "",
      email: doc.data().email ?? "",
    }));

    // 所属塾情報を解決
    const orgId =
      typeof data.organizationId === "string" ? data.organizationId : undefined;
    let organizationName: string | undefined;
    if (orgId) {
      const orgDoc = await adminDb.doc(`organizations/${orgId}`).get();
      if (orgDoc.exists) organizationName = orgDoc.data()?.name ?? undefined;
    }

    return NextResponse.json({
      uid: id,
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      role: data.role,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      organizationId: orgId,
      organizationName,
      managedBy: typeof data.managedBy === "string" ? data.managedBy : undefined,
      students,
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
  if (body.displayName) updates.displayName = body.displayName;
  if (body.role) updates.role = body.role;
  // 所属塾変更: managedBy (= 代表 admin) を指定すると、 その admin の
  // organizationId を講師に継承
  if (typeof body.managedBy === "string") {
    if (adminDb) {
      const adminDocSnap = await adminDb.doc(`users/${body.managedBy}`).get();
      if (adminDocSnap.exists && adminDocSnap.data()?.role === "admin") {
        updates.managedBy = body.managedBy;
        const orgId = adminDocSnap.data()?.organizationId;
        if (typeof orgId === "string") {
          updates.organizationId = orgId;
        }
      } else {
        return NextResponse.json(
          { error: "managedBy は admin ロールのユーザーである必要があります" },
          { status: 400 },
        );
      }
    }
  }
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
