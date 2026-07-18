import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { checkAiLikeness } from "@/lib/ai/ai-likeness";

/**
 * 管理者（admin/teacher/superadmin）が生徒の出願書類の「AIっぽさ」を判定する API。
 * 判定対象は保存済みの本文（documents/{docId}.content）。結果は生徒と共有の
 * documents/{docId}.aiLikeness に保存するため、生徒側にもそのまま反映される。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, docId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 組織スコープ（自塾の admin は代行可、担当講師も許可）
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const denied = await scopeByOrganization({
      requesterUid: callerUid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: studentDoc.data()?.managedBy,
        organizationId: studentDoc.data()?.organizationId,
        assignedTeacherIds: getAssignedTeacherIds(studentDoc.data()),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;

    // 実データはグローバル `documents`。userId が対象生徒と一致することを確認。
    const docRef = adminDb.doc(`documents/${docId}`);
    const snap = await docRef.get();
    const data = snap.data();
    if (!snap.exists || data?.userId !== studentId) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    const content: string = data?.content ?? "";
    if (!content.trim()) {
      return NextResponse.json({ error: "本文が空のため判定できません" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const aiLikeness = await checkAiLikeness(content, {
      documentType: data?.type ?? "出願書類",
      universityName: data?.universityName ?? "未指定",
      facultyName: data?.facultyName ?? "未指定",
    });

    await docRef.update({ aiLikeness });

    return NextResponse.json({ aiLikeness, documentId: docId });
  } catch (error) {
    console.error("Admin document ai-likeness error:", error);
    return NextResponse.json(
      { error: "AIっぽさ判定中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
