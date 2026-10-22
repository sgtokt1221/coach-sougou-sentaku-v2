import { FieldValue } from "firebase-admin/firestore";
import type {
  DocumentReview,
  DocumentReviewHistoryEntry,
  DocumentReviewState,
} from "@/lib/types/document";

/**
 * 書類のレビュー状態（承認/差し戻し/取り消し）を書く。
 * 即時のレビュー API と、予約送信の配信（時刻が来たとき）の両方がここを通る。
 * 書類が無いか生徒のものでなければ null。
 */
export async function applyDocumentReview(
  db: FirebaseFirestore.Firestore,
  opts: {
    studentId: string;
    docId: string;
    state: DocumentReviewState | "cleared";
    callerUid: string;
    comment?: string;
    /**
     * 操作時刻。予約の再試行では同じ値を渡すので、履歴は arrayUnion で
     * 同じ要素として1件にまとまる（二重に積まれない）
     */
    at?: string;
  }
): Promise<
  | { cleared: true; entry: DocumentReviewHistoryEntry }
  | DocumentReview
  | null
> {
  // 書類はグローバル。userId が対象生徒と一致することを確認。
  const ref = db.doc(`documents/${opts.docId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== opts.studentId) return null;

  // 承認者の表示名
  let byName = "コーチ";
  try {
    const me = await db.doc(`users/${opts.callerUid}`).get();
    byName = (me.data()?.displayName as string | undefined)?.trim() || byName;
  } catch {
    /* noop */
  }

  const at = opts.at ?? new Date().toISOString();
  // 何をしたかは履歴に必ず残す。review は最新状態しか持たないため、
  // 取り消すと「誰がいつ承認していたか」が消えてしまう。
  const entry: DocumentReviewHistoryEntry = {
    action: opts.state,
    by: opts.callerUid,
    byName,
    at,
    ...(opts.comment?.trim() ? { comment: opts.comment.trim() } : {}),
  };

  if (opts.state === "cleared") {
    await ref.set(
      {
        review: FieldValue.delete(),
        reviewHistory: FieldValue.arrayUnion(entry),
        updatedAt: at,
      },
      { merge: true }
    );
    return { cleared: true, entry };
  }

  const review: DocumentReview = {
    state: opts.state,
    by: opts.callerUid,
    byName,
    at,
  };
  await ref.set(
    {
      review,
      reviewHistory: FieldValue.arrayUnion(entry),
      updatedAt: at,
    },
    { merge: true }
  );
  return review;
}
