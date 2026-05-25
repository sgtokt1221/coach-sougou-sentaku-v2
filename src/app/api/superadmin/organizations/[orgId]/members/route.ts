import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST: 子 admin 追加 (body: { adminUid })
 * DELETE: 子 admin 除外 (body: { adminUid })
 *
 * owner admin は除外できない (= 組織の代表)。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { orgId } = await params;
  const body = await request.json();
  const adminUid: string = body.adminUid?.trim();
  if (!adminUid) {
    return NextResponse.json({ error: "adminUid は必須" }, { status: 400 });
  }

  const userDoc = await adminDb.doc(`users/${adminUid}`).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    return NextResponse.json(
      { error: "追加対象は admin ロールである必要があります" },
      { status: 400 },
    );
  }

  await adminDb.doc(`organizations/${orgId}`).update({
    memberAdminUids: FieldValue.arrayUnion(adminUid),
  });
  await adminDb.doc(`users/${adminUid}`).update({ organizationId: orgId });

  return NextResponse.json({ orgId, adminUid, added: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const { orgId } = await params;
  const body = await request.json();
  const adminUid: string = body.adminUid?.trim();
  if (!adminUid) {
    return NextResponse.json({ error: "adminUid は必須" }, { status: 400 });
  }

  const orgDoc = await adminDb.doc(`organizations/${orgId}`).get();
  if (orgDoc.data()?.ownerAdminUid === adminUid) {
    return NextResponse.json(
      { error: "owner admin は除外できません" },
      { status: 400 },
    );
  }

  await adminDb.doc(`organizations/${orgId}`).update({
    memberAdminUids: FieldValue.arrayRemove(adminUid),
  });
  await adminDb.doc(`users/${adminUid}`).update({
    organizationId: FieldValue.delete(),
  });

  return NextResponse.json({ orgId, adminUid, removed: true });
}
