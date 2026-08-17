import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  DocumentReviewError,
  reviewDocumentCore,
} from "@/lib/documents/review-core";

/**
 * POST /api/admin/students/[id]/documents/[docId]/review-ai
 *
 * 管理者・講師が生徒の出願書類をAI添削する。
 *
 * 従来はAI添削を生徒しか実行できず、生徒が添削を回すまで管理者側に
 * AP合致度・構成・独自性の点が出なかった。面談の場で「まずAIに見せてみる」が
 * できず、講師が判断材料なしで書類を読む状態だった。
 *
 * 採点は生徒側と同じ lib/documents/review-core.ts を通す。結果は生徒と共有の
 * documents/{docId}.feedback に保存するので、生徒側にもそのまま反映される。
 * 隣の ai-check（個別性チェック）と同じ扱い。
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

    // 添削対象は保存済みの本文。管理者は編集しないので content は受け取らない
    const { feedback, feedbackAt } = await reviewDocumentCore({
      documentId: docId,
      ownerUid: studentId,
    });

    return NextResponse.json({ feedback, documentId: docId, feedbackAt });
  } catch (error) {
    if (error instanceof DocumentReviewError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("[admin/documents/review-ai] failed:", error);
    return NextResponse.json(
      { error: "添削処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
