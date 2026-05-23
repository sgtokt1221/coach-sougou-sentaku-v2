import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * GET /api/student/homework/[id]
 *
 * 自分に配布された宿題の詳細取得。スナップショット (問題タイトル・ヒント等) を返す。
 * 解答例 (modelAnswer) や rubric は **絶対に返さない** (生徒に見せないため
 * snapshot に含めていない設計だが、念のため明示)。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore に接続できません" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const snap = await adminDb
      .doc(`users/${uid}/homeworkAssignments/${id}`)
      .get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "宿題が見つかりません" },
        { status: 404 },
      );
    }

    const data = snap.data() as Omit<HomeworkAssignment, "assignedAt"> & {
      assignedAt?: string | { toDate?: () => Date };
    };
    const ts = data.assignedAt;
    const assignedAt =
      typeof ts === "string"
        ? ts
        : ts && typeof ts === "object" && typeof ts.toDate === "function"
          ? ts.toDate().toISOString()
          : new Date().toISOString();

    const result: HomeworkAssignment = {
      ...data,
      id: snap.id,
      assignedAt,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[student/homework/id GET] error:", error);
    return NextResponse.json(
      { error: "宿題の取得に失敗しました" },
      { status: 500 },
    );
  }
}
