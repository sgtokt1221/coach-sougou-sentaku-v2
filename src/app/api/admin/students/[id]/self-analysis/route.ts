/**
 * 管理者が個別生徒の自己分析 (Discover) を閲覧・編集するための API。
 * admin/teacher/superadmin に限定、managedBy スコーピング (teacher は session-access 経由も許容)。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

/** 自己分析セクション（＝コメント/承認の対象）キー */
const STEP_KEYS = [
  "values",
  "strengths",
  "weaknesses",
  "interests",
  "vision",
  "identity",
  "synthesis",
] as const;

/**
 * 呼び出し元が対象生徒にアクセスできるか判定する。
 * OK なら null、NG なら NextResponse（404/403）。GET/PATCH で共用。
 */
async function assertScope(
  callerUid: string,
  role: string,
  studentId: string,
): Promise<NextResponse | null> {
  const studentDoc = await adminDb!.doc(`users/${studentId}`).get();
  if (!studentDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = studentDoc.data();
  const orgDenied = await scopeByOrganization({
    requesterUid: callerUid,
    requesterRole: role,
    studentUid: studentId,
    studentData: {
      managedBy: userData?.managedBy as string | undefined,
      organizationId: userData?.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(userData),
    },
    allowAssignedTeacher: true,
  });
  if (orgDenied) {
    if (role === "teacher") {
      const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
      const hasAccess = await hasActiveSessionAccess(callerUid, studentId);
      if (!hasAccess) return orgDenied;
    } else {
      return orgDenied;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;

  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const denied = await assertScope(callerUid, role, studentId);
  if (denied) return denied;

  const doc = await adminDb.doc(`selfAnalysis/${studentId}`).get();
  if (!doc.exists) {
    return NextResponse.json(null);
  }
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

/**
 * 管理者による自己分析セクションの編集。
 * body に含まれた非空のステップ（values/strengths/…/synthesis）のみを
 * 非破壊マージで上書きする（空 {} で既存を潰さない）。
 * ※承認状態は変更しない（「編集で未承認へ戻す」のは生徒本人の編集のみの仕様）。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;

  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const denied = await assertScope(callerUid, role, studentId);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const ref = adminDb.doc(`selfAnalysis/${studentId}`);
  const existingSnap = await ref.get();
  if (!existingSnap.exists) {
    return NextResponse.json({ error: "自己分析データがありません" }, { status: 404 });
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of STEP_KEYS) {
    const v = body[key];
    if (v && typeof v === "object" && Object.keys(v).length > 0) {
      update[key] = v;
    }
  }

  await ref.set(update, { merge: true });
  return NextResponse.json({ success: true });
}
