import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ActivityCategory } from "@/lib/types/activity";

interface ActivityListItem {
  id: string;
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
  isStructured: boolean;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    if (role !== "superadmin") {
      const studentDoc = await adminDb.doc(`users/${studentId}`).get();
      if (!studentDoc.exists || studentDoc.data()?.managedBy !== callerUid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }

    const snapshot = await adminDb
      .collection(`users/${studentId}/activities`)
      .orderBy("updatedAt", "desc")
      .get();

    const activities: ActivityListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        category: data.category ?? "other",
        period: data.period ?? { start: "", end: "" },
        description: data.description ?? "",
        isStructured: !!data.structuredData,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Admin student activities error:", error);
    return NextResponse.json({ error: "データの取得中にエラーが発生しました" }, { status: 500 });
  }
}
