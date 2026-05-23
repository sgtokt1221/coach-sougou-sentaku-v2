import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * GET /api/student/homework
 *
 * 自分に配布された宿題のうち、未提出 (status=assigned/in_progress) のみを返す。
 * status=submitted/reviewed のものは既に essays/interviews 履歴に表示されるので
 * このエンドポイントでは扱わない (二重表示防止)。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json([]);
  }

  try {
    const snap = await adminDb
      .collection(`users/${uid}/homeworkAssignments`)
      .where("status", "in", ["assigned", "in_progress"])
      .get();

    const items: HomeworkAssignment[] = snap.docs.map((d) => {
      const data = d.data() as Omit<HomeworkAssignment, "assignedAt"> & {
        assignedAt?: string | { toDate?: () => Date };
      };
      const ts = data.assignedAt;
      const assignedAt =
        typeof ts === "string"
          ? ts
          : ts && typeof ts === "object" && typeof ts.toDate === "function"
            ? ts.toDate().toISOString()
            : new Date().toISOString();
      return { ...data, id: d.id, assignedAt };
    });

    // 締切が近い順 (締切なしは末尾)
    items.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[student/homework] error:", error);
    return NextResponse.json(
      { error: "宿題一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}
