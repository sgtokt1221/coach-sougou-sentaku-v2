import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

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
    const batch = adminDb.batch();
    for (const uid of studentUids) {
      batch.update(adminDb.doc(`users/${uid}`), {
        managedBy: toAdminUid,
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
