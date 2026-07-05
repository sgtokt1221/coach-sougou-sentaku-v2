/**
 * 管理者が生徒の自己分析ステップに「承認(OK)」を出す/取り消すための API。
 * admin/teacher/superadmin に限定、managedBy スコーピング（teacher は session-access 経由も許容）。
 * 保存先: selfAnalysisApprovals/{studentId} の steps.{stepKey} = { approved, by, byName, at }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { SelfAnalysisStepKey, StepApproval } from "@/lib/types/self-analysis";

const STEP_KEYS: SelfAnalysisStepKey[] = [
  "values",
  "strengths",
  "weaknesses",
  "interests",
  "vision",
  "identity",
  "synthesis",
];

/** 呼び出し元が対象生徒にアクセスできるか（self-analysis GET と同じ判定）。OKなら null、NGなら NextResponse。 */
async function checkScope(
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
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });

  const denied = await checkScope(callerUid, role, studentId);
  if (denied) return denied;

  const doc = await adminDb.doc(`selfAnalysisApprovals/${studentId}`).get();
  return NextResponse.json({ steps: doc.exists ? (doc.data()?.steps ?? {}) : {} });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId } = await params;
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });

  let body: { step?: string; approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  const step = body.step as SelfAnalysisStepKey;
  if (!step || !STEP_KEYS.includes(step)) {
    return NextResponse.json({ error: "step が不正です" }, { status: 400 });
  }
  const approved = body.approved === true;

  const denied = await checkScope(callerUid, role, studentId);
  if (denied) return denied;

  // 承認者の表示名
  let byName = "コーチ";
  try {
    const me = await adminDb.doc(`users/${callerUid}`).get();
    byName = (me.data()?.displayName as string | undefined)?.trim() || byName;
  } catch {
    /* noop */
  }

  const entry: StepApproval = {
    approved,
    by: callerUid,
    byName,
    at: new Date().toISOString(),
  };
  await adminDb
    .doc(`selfAnalysisApprovals/${studentId}`)
    .set({ steps: { [step]: entry } }, { merge: true });

  return NextResponse.json({ step, ...entry });
}
