import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { DocumentReviewError } from "@/lib/documents/review-core";
import { generateDocumentInterviewQuestions } from "@/lib/documents/interview-questions";

export const maxDuration = 120;

/**
 * POST /api/admin/students/[id]/documents/[docId]/interview-questions
 *
 * 管理者・講師が、生徒の書類から面接で突っ込まれそうな箇所と質問を作る。
 * 認可は review-ai と同じ（自塾の admin と担当講師）。結果は生徒と共有の
 * documents/{docId}.feedback.interviewQuestions に保存する。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
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
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
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

    // 実データはグローバル `documents`。userId が対象生徒と一致することを確認
    const snap = await adminDb.doc(`documents/${docId}`).get();
    if (!snap.exists || snap.data()?.userId !== studentId) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }

    const questions = await generateDocumentInterviewQuestions({
      documentId: docId,
    });
    return NextResponse.json({ questions });
  } catch (error) {
    if (error instanceof DocumentReviewError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("[admin/documents/interview-questions] failed:", error);
    return NextResponse.json(
      { error: "質問の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
