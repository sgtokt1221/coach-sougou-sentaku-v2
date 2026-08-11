/**
 * 管理者が生徒の出願書類に承認/差し戻しのレビュー状態を設定する API。
 * 状態のみを更新（コメント通知はクライアントが既存 feedback API で別途送る）。
 * 保存先: グローバル documents/{docId} の review = { state, by, byName, at }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type {
  DocumentReview,
  DocumentReviewHistoryEntry,
  DocumentReviewState,
} from "@/lib/types/document";

const REVIEW_STATES: DocumentReviewState[] = ["approved", "revision_requested"];
/** 承認/差し戻しの取り消し。review を消して未レビューへ戻す */
const CLEAR = "cleared" as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, docId } = await params;
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });

  let body: { state?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  const state = body.state as DocumentReviewState | typeof CLEAR;
  if (
    !state ||
    (state !== CLEAR && !REVIEW_STATES.includes(state as DocumentReviewState))
  ) {
    return NextResponse.json({ error: "state が不正です" }, { status: 400 });
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

    // 書類はグローバル。userId が対象生徒と一致することを確認。
    const ref = adminDb.doc(`documents/${docId}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== studentId) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    // 承認者の表示名
    let byName = "コーチ";
    try {
      const me = await adminDb.doc(`users/${callerUid}`).get();
      byName = (me.data()?.displayName as string | undefined)?.trim() || byName;
    } catch {
      /* noop */
    }

    const at = new Date().toISOString();
    // 何をしたかは履歴に必ず残す。review は最新状態しか持たないため、
    // 取り消すと「誰がいつ承認していたか」が消えてしまう。
    const entry: DocumentReviewHistoryEntry = {
      action: state,
      by: callerUid,
      byName,
      at,
      ...(body.comment?.trim() ? { comment: body.comment.trim() } : {}),
    };

    if (state === CLEAR) {
      await ref.set(
        {
          review: FieldValue.delete(),
          reviewHistory: FieldValue.arrayUnion(entry),
          updatedAt: at,
        },
        { merge: true },
      );
      return NextResponse.json({ cleared: true, entry });
    }

    const review: DocumentReview = {
      state: state as DocumentReviewState,
      by: callerUid,
      byName,
      at,
    };
    await ref.set(
      {
        review,
        reviewHistory: FieldValue.arrayUnion(entry),
        updatedAt: at,
      },
      { merge: true },
    );

    return NextResponse.json(review);
  } catch (error) {
    console.error("Document review error:", error);
    return NextResponse.json(
      { error: "レビュー状態の更新に失敗しました" },
      { status: 500 },
    );
  }
}
