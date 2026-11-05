import type { Firestore } from "firebase-admin/firestore";
import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
import { computeRetryComparison } from "@/lib/essay/retry-comparison";
import type {
  EssayFeedback,
  EssayScores,
  RetryComparison,
} from "@/lib/types/essay";

/**
 * 書き直しの答案なら、親の答案を読んで前回比を出す（保存はしない。読むたびに出す）。
 * 生徒の結果画面と管理者の答案詳細が同じ比べ方をするよう、ここだけで組み立てる。
 * feedback は derive を通した後のものを渡す（親も同じ規則にそろえて比べる）。
 */
export async function loadRetryComparison(
  db: Firestore,
  parentEssayId: string | null | undefined,
  current: { scores: EssayScores | undefined; feedback: EssayFeedback | undefined }
): Promise<RetryComparison | undefined> {
  if (!parentEssayId || !current.scores || !current.feedback) return undefined;
  try {
    const parentDoc = await db.doc(`essays/${parentEssayId}`).get();
    if (!parentDoc.exists) return undefined;
    const pdata = parentDoc.data()!;
    if (!pdata.scores || !pdata.feedback) return undefined;
    return computeRetryComparison(
      {
        id: parentDoc.id,
        attemptNumber:
          typeof pdata.attemptNumber === "number" ? pdata.attemptNumber : 1,
        submittedAt: pdata.submittedAt?.toDate?.() ?? new Date(),
        scores: pdata.scores as EssayScores,
        feedback: feedbackWithDerivedIssues(
          pdata.feedback as EssayFeedback,
          pdata.sentenceCheck,
          { partial: isPartialEssay(pdata) }
        ),
      },
      { scores: current.scores, feedback: current.feedback }
    );
  } catch (err) {
    console.warn("Failed to compute retry comparison:", err);
    return undefined;
  }
}
