import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/firebase/activity-log";

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { studentUids, adminUid } = body as {
    studentUids: string[];
    adminUid: string;
  };

  if (!studentUids?.length || !adminUid) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({
      success: true,
      assigned: studentUids.length,
      adminUid,
    });
  }

  try {
    const batch = adminDb.batch();
    for (const uid of studentUids) {
      batch.update(adminDb.doc(`users/${uid}`), {
        managedBy: adminUid,
        updatedAt: new Date(),
      });
    }
    await batch.commit();

    // Activity log
    let adminName = "不明";
    let studentNames: string[] = [];
    try {
      const adminDoc = await adminDb.doc(`users/${adminUid}`).get();
      adminName = adminDoc.data()?.displayName ?? "不明";
      const studentDocs = await Promise.all(
        studentUids.slice(0, 5).map((uid) => adminDb!.doc(`users/${uid}`).get())
      );
      studentNames = studentDocs.map((d) => d.data()?.displayName ?? "不明");
    } catch { /* ignore */ }
    const studentLabel = studentNames.join("、") + (studentUids.length > 5 ? ` 他${studentUids.length - 5}名` : "");
    void logActivity("student_assigned", `${studentLabel}を${adminName}に割り当てました`, {
      adminName,
      studentName: studentLabel,
    });

    return NextResponse.json({
      success: true,
      assigned: studentUids.length,
      adminUid,
    });
  } catch {
    return NextResponse.json({ error: "割り当てに失敗しました" }, { status: 500 });
  }
}
