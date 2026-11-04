import { adminDb } from "@/lib/firebase/admin";
import { viewedDocId, type SubmissionKind } from "@/lib/api/submission-kinds";

/**
 * 提出物を開いた管理者・講師の既読を記録する。
 *
 * 詳細APIの中で呼ぶ（画面ごとに呼ばせると、面談画面のダイアログのように
 * 呼び忘れた入口から開いても赤が消えず、「すべて既読」ボタンが要っていた）。
 * 失敗しても本文の表示は止めない。
 */
export async function recordSubmissionViewed(
  viewerUid: string,
  kind: SubmissionKind,
  id: string,
  studentId: string,
): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.doc(`users/${viewerUid}/viewedSubmissions/${viewedDocId(kind, id)}`).set({
      kind,
      submissionId: id,
      studentId,
      viewedAt: new Date(),
    });
  } catch (err) {
    console.warn("[viewed-submissions] 既読の記録に失敗:", err);
  }
}
