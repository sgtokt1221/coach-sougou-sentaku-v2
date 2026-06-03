import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import type { SkillCheckResult, SkillRank } from "@/lib/types/skill-check";

/**
 * GET /api/admin/students/[id]/skill-check/[resultId]
 * 管理者/講師が生徒の小論文スキルチェック1件の詳細を取得する。
 * 認可は scopeByOrganization (担当 / 同じ塾の管理者 / 担当講師)。
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; resultId: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;
  const { id: studentId, resultId } = await context.params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });

  const studentDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!studentDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const sd = studentDoc.data()!;
  const denied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid: studentId,
    studentData: {
      managedBy: sd.managedBy as string | undefined,
      organizationId: sd.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(sd),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  const doc = await adminDb.doc(`users/${studentId}/skillChecks/${resultId}`).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const r = doc.data()!;
  const result: SkillCheckResult = {
    id: doc.id,
    userId: studentId,
    category: r.category,
    questionId: r.questionId,
    essayText: r.essayText,
    wordCount: r.wordCount ?? 0,
    durationSec: r.durationSec ?? 0,
    scores: r.scores,
    rank: r.rank as SkillRank,
    feedback: r.feedback,
    takenAt: r.takenAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    version: "v1",
  } as SkillCheckResult;
  return NextResponse.json(result);
}
