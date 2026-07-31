import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { MemberListItem } from "@/lib/types/admin";

/**
 * 管理者(admin)が「自分の塾(組織)」のメンバー管理を行うAPI。
 * - GET: 自塾の admin メンバー一覧
 * - POST: 新規 admin アカウントを作成して自塾に追加 (組織が無ければ作成=ブートストラップ)
 * - DELETE: 子 admin を自塾から外す (owner は不可)
 *
 * 認可は requireRole(["admin","superadmin"]) のみ。操作対象は常に requester 自身の
 * organizationId に固定する (orgId をクライアントから受け取らない)。
 */

/** requester のユーザーデータと組織IDを返す */
async function getRequesterOrg(uid: string) {
  const meRef = adminDb!.doc(`users/${uid}`);
  const me = (await meRef.get()).data() ?? {};
  const orgId = typeof me.organizationId === "string" ? me.organizationId : null;
  return { meRef, me, orgId };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ organizationId: null, organizationName: null, members: [] });
  }
  const { uid } = auth;
  const { me, orgId } = await getRequesterOrg(uid);

  // 組織未所属: 自分のみ返す (フロントで「最初の追加で塾を作成」案内)
  if (!orgId) {
    const self: MemberListItem = {
      uid,
      displayName: me.displayName ?? "",
      email: me.email ?? "",
      role: "admin",
      photoURL: (me.photoURL as string | undefined) ?? null,
      isOwner: true,
    };
    return NextResponse.json({
      organizationId: null,
      organizationName: null,
      ownerAdminUid: uid,
      members: [self],
    });
  }

  const org = (await adminDb.doc(`organizations/${orgId}`).get()).data() ?? {};
  // 所属の正本は users/{uid}.organizationId。organizations.memberAdminUids と
  // 二重に持つと片方だけ更新されて黙ってズレるため、users 側から引く。
  const staffSnap = await adminDb
    .collection("users")
    .where("organizationId", "==", orgId)
    .get();
  const memberUids = staffSnap.docs
    .filter((d) => d.data().role === "admin")
    .map((d) => d.id);
  const uids = Array.from(new Set<string>([uid, ...memberUids]));
  const members: MemberListItem[] = await Promise.all(
    uids.map(async (mUid) => {
      const d = (await adminDb!.doc(`users/${mUid}`).get()).data() ?? {};
      return {
        uid: mUid,
        displayName: d.displayName ?? "",
        email: d.email ?? "",
        role: "admin" as const,
        photoURL: (d.photoURL as string | undefined) ?? null,
        isOwner: org.ownerAdminUid === mUid,
      };
    }),
  );

  return NextResponse.json({
    organizationId: orgId,
    organizationName: org.name ?? "",
    ownerAdminUid: org.ownerAdminUid ?? uid,
    members,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { uid } = auth;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    displayName?: string;
    password?: string;
  } | null;
  const email = body?.email?.trim();
  const displayName = body?.displayName?.trim();
  const password = body?.password;
  if (!email || !displayName || !password) {
    return NextResponse.json(
      { error: "email, displayName, password は必須です" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
  }

  // requester の組織を解決。無ければブートストラップ (requester を owner とする塾を作成)
  const { meRef, me } = await getRequesterOrg(uid);
  let orgId = typeof me.organizationId === "string" ? me.organizationId : null;
  if (!orgId) {
    const orgRef = adminDb.collection("organizations").doc();
    await orgRef.set({
      name: me.displayName ?? "新しい塾",
      ownerAdminUid: uid,
      memberAdminUids: [uid],
      createdAt: new Date().toISOString(),
    });
    orgId = orgRef.id;
    await meRef.update({ organizationId: orgId });
  }

  try {
    const userRecord = await adminAuth.createUser({ email, password, displayName });
    // role は常に admin 固定 (権限昇格防止)。organizationId は requester の塾に固定。
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
    const member: MemberListItem = {
      uid: userRecord.uid,
      email,
      displayName,
      role: "admin",
      isOwner: false,
    };
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "作成に失敗しました" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  const { uid } = auth;

  const body = (await request.json().catch(() => null)) as { adminUid?: string } | null;
  const adminUid = body?.adminUid?.trim();
  if (!adminUid) return NextResponse.json({ error: "adminUid は必須です" }, { status: 400 });

  const { orgId } = await getRequesterOrg(uid);
  if (!orgId) return NextResponse.json({ error: "組織がありません" }, { status: 400 });

  const org = (await adminDb.doc(`organizations/${orgId}`).get()).data() ?? {};
  const memberUids: string[] = Array.isArray(org.memberAdminUids) ? org.memberAdminUids : [];
  if (!memberUids.includes(adminUid)) {
    return NextResponse.json({ error: "自塾のメンバーではありません" }, { status: 403 });
  }
  if (org.ownerAdminUid === adminUid) {
    return NextResponse.json({ error: "代表(owner)は外せません" }, { status: 400 });
  }

  await adminDb.doc(`organizations/${orgId}`).update({
    memberAdminUids: FieldValue.arrayRemove(adminUid),
  });
  await adminDb.doc(`users/${adminUid}`).update({ organizationId: FieldValue.delete() });

  return NextResponse.json({ adminUid, removed: true });
}
