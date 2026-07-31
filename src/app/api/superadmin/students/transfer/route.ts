import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { orgFieldsFollowingManager } from "@/lib/api/organization-scope";

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { studentUids, toAdminUid } = body as {
    studentUids: string[];
    toAdminUid: string;
  };

  if (!studentUids?.length || !toAdminUid) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({
      success: true,
      transferred: studentUids.length,
      toAdminUid,
    });
  }

  try {
    // 所属は担当者に追従させる。これが無いと managedBy は移管先を指すのに
    // organizationId が移管元のままになり、移管元の塾からも見え続ける。
    const orgFields = await orgFieldsFollowingManager(adminDb, toAdminUid);
    const batch = adminDb.batch();
    for (const uid of studentUids) {
      batch.update(adminDb.doc(`users/${uid}`), {
        managedBy: toAdminUid,
        ...orgFields,
        updatedAt: new Date(),
      });
    }
    await batch.commit();

    return NextResponse.json({
      success: true,
      transferred: studentUids.length,
      toAdminUid,
    });
  } catch {
    return NextResponse.json({ error: "移管に失敗しました" }, { status: 500 });
  }
}
