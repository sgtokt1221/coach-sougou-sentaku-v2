import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 組織詳細の取得 + 名称更新 (superadmin 限定)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { orgId } = await params;
  const doc = await adminDb.doc(`organizations/${orgId}`).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "組織が見つかりません" }, { status: 404 });
  }
  const data = doc.data()!;
  const memberUids = (data.memberAdminUids ?? []) as string[];

  // メンバー admin の表示名を解決
  const members = await Promise.all(
    memberUids.map(async (uid) => {
      const userDoc = await adminDb!.doc(`users/${uid}`).get();
      return {
        uid,
        displayName: userDoc.data()?.displayName ?? "",
        email: userDoc.data()?.email ?? "",
        isOwner: uid === data.ownerAdminUid,
      };
    }),
  );

  // 所属生徒 / 講師数
  const [studentSnap, teacherSnap] = await Promise.all([
    adminDb
      .collection("users")
      .where("organizationId", "==", orgId)
      .where("role", "==", "student")
      .get(),
    adminDb
      .collection("users")
      .where("organizationId", "==", orgId)
      .where("role", "==", "teacher")
      .get(),
  ]);

  return NextResponse.json({
    id: orgId,
    name: data.name ?? "",
    ownerAdminUid: data.ownerAdminUid ?? "",
    members,
    studentCount: studentSnap.size,
    teacherCount: teacherSnap.size,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { orgId } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "更新項目なし" }, { status: 400 });
  }
  await adminDb.doc(`organizations/${orgId}`).update(updates);
  return NextResponse.json({ id: orgId, ...updates });
}
