import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { OrganizationListItem } from "@/lib/types/organization";

/**
 * GET: 全組織一覧 (superadmin 限定)
 * POST: 新規組織作成 (name + ownerAdminUid 必須)
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const snap = await adminDb.collection("organizations").get();

  const items: OrganizationListItem[] = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const memberUids = (data.memberAdminUids ?? []) as string[];
      const ownerDoc = await adminDb!.doc(`users/${data.ownerAdminUid}`).get();
      const ownerName = ownerDoc.data()?.displayName ?? "";

      // 生徒 / 講師数を集計
      const [studentSnap, teacherSnap] = await Promise.all([
        adminDb!
          .collection("users")
          .where("organizationId", "==", doc.id)
          .where("role", "==", "student")
          .get(),
        adminDb!
          .collection("users")
          .where("organizationId", "==", doc.id)
          .where("role", "==", "teacher")
          .get(),
      ]);

      return {
        id: doc.id,
        name: data.name ?? "",
        ownerAdminUid: data.ownerAdminUid ?? "",
        ownerAdminName: ownerName,
        memberCount: memberUids.length,
        studentCount: studentSnap.size,
        teacherCount: teacherSnap.size,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    }),
  );

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const body = await request.json();
  const name: string = body.name?.trim();
  const ownerAdminUid: string = body.ownerAdminUid?.trim();

  if (!name || !ownerAdminUid) {
    return NextResponse.json(
      { error: "name + ownerAdminUid は必須" },
      { status: 400 },
    );
  }

  const ownerDoc = await adminDb.doc(`users/${ownerAdminUid}`).get();
  if (!ownerDoc.exists || ownerDoc.data()?.role !== "admin") {
    return NextResponse.json(
      { error: "ownerAdminUid は admin ロールのユーザーである必要があります" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const docRef = await adminDb.collection("organizations").add({
    name,
    ownerAdminUid,
    memberAdminUids: [ownerAdminUid],
    createdAt: now,
  });

  // owner admin に organizationId を付与
  await adminDb.doc(`users/${ownerAdminUid}`).update({ organizationId: docRef.id });

  return NextResponse.json({ id: docRef.id, name, ownerAdminUid });
}
