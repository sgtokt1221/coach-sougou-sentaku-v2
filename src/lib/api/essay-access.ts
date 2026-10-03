import { NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 答案（essays/{id}）を読んでよいかを判定する。
 * 生徒は自分の答案だけ、管理者・講師は担当の生徒の答案だけ。
 *
 * 結果API・指摘の結び付けAPIなど、答案を返す（または答案を読んで AI に渡す）
 * エンドポイントはこれを通す。個別に書くと、どれか1つだけ確認が抜ける
 * （結果APIは以前、認証も持ち主の確認も無かった）。
 */
export async function authorizeEssayAccess(
  request: Request,
  essay: { userId?: unknown }
): Promise<{ uid: string; role: string } | NextResponse> {
  const authResult = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const studentUid = String(essay.userId ?? "");
  if (authResult.role === "student") {
    return studentUid === authResult.uid
      ? authResult
      : NextResponse.json(
          { error: "この小論文を見る権限がありません" },
          { status: 403 }
        );
  }
  const student = studentUid
    ? (await adminDb?.doc(`users/${studentUid}`).get())?.data()
    : undefined;
  const denied = await scopeByOrganization({
    requesterUid: authResult.uid,
    requesterRole: authResult.role,
    studentUid,
    studentData: {
      managedBy: student?.managedBy,
      organizationId: student?.organizationId,
      assignedTeacherIds: getAssignedTeacherIds(student),
    },
    allowAssignedTeacher: true,
  });
  return denied ?? authResult;
}
