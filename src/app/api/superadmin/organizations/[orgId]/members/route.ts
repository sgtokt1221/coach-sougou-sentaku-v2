import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST: 子 admin 追加。2 通りの body を受け付ける:
 *   - { adminUid }                         既存 admin を組織に追加 (従来)
 *   - { email, displayName, password }     新規 admin を作成して組織に追加
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
  const body = await request.json().catch(() => ({}));

  // 新規 admin を作成して追加するパターン
  const email: string | undefined = body.email?.trim();
  const displayName: string | undefined = body.displayName?.trim();
  const password: string | undefined = body.password;
  if (email || displayName || password) {
    if (!email || !displayName || !password) {
      return NextResponse.json(
        { error: "email, displayName, password は必須です" },
        { status: 400 },
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
    }
    if (!adminAuth) return NextResponse.json({ error: "Auth 未初期化" }, { status: 500 });
    try {
      const userRecord = await adminAuth.createUser({ email, password, displayName });
      await adminDb.doc(`users/${userRecord.uid}`).set({
        email,
        displayName,
        role: "admin",
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await adminDb.doc(`organizations/${orgId}`).update({
        memberAdminUids: FieldValue.arrayUnion(userRecord.uid),
      });
      return NextResponse.json({ orgId, adminUid: userRecord.uid, created: true, added: true });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "作成に失敗しました" },
        { status: 400 },
      );
    }
  }

  // 既存 admin を追加するパターン (従来)
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
