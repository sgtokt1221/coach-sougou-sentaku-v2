import { NextRequest, NextResponse } from "next/server";
import { computeRetryComparison } from "@/lib/essay/retry-comparison";
import type { EssayFeedback, EssayScores, RetryComparison } from "@/lib/types/essay";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDKが初期化されていません" },
        { status: 500 }
      );
    }

    const essayDoc = await adminDb.doc(`essays/${id}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json({ error: "小論文が見つかりません" }, { status: 404 });
    }

    const data = essayDoc.data()!;

    // 大学名・学部名を解決
    let universityName = data.targetUniversity ?? "";
    let facultyName = data.targetFaculty ?? "";
    if (data.targetUniversity) {
      try {
        const uniDoc = await adminDb.doc(`universities/${data.targetUniversity}`).get();
        if (uniDoc.exists) {
          const uniData = uniDoc.data()!;
          universityName = uniData.name ?? data.targetUniversity;
          const faculty = (uniData.faculties ?? []).find((f: { id: string }) => f.id === data.targetFaculty);
          facultyName = faculty?.name ?? data.targetFaculty ?? "";
        }
      } catch {}
    }

    const scores = (data.scores ?? {}) as EssayScores;
    const feedback = (data.feedback ?? {}) as EssayFeedback;
    const attemptNumber = typeof data.attemptNumber === "number" ? data.attemptNumber : 1;
    const rootEssayId: string = data.rootEssayId ?? essayDoc.id;
    const parentEssayId: string | null = data.parentEssayId ?? null;

    // 親essayがあれば前回比を毎回算出
    let retryComparison: RetryComparison | undefined;
    if (parentEssayId && data.scores && data.feedback) {
      try {
        const parentDoc = await adminDb.doc(`essays/${parentEssayId}`).get();
        if (parentDoc.exists) {
          const pdata = parentDoc.data()!;
          if (pdata.scores && pdata.feedback) {
            retryComparison = computeRetryComparison(
              {
                id: parentDoc.id,
                attemptNumber: typeof pdata.attemptNumber === "number" ? pdata.attemptNumber : 1,
                submittedAt: pdata.submittedAt?.toDate?.() ?? new Date(),
                scores: pdata.scores as EssayScores,
                feedback: pdata.feedback as EssayFeedback,
              },
              { scores, feedback }
            );
          }
        }
      } catch (err) {
        console.warn("Failed to compute retry comparison:", err);
      }
    }

    return NextResponse.json({
      id: essayDoc.id,
      universityName,
      facultyName,
      topic: data.topic ?? "",
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      ocrText: data.ocrText ?? "",
      status: data.status ?? "reviewed",
      inlineComments: data.inlineComments ?? [],
      scores,
      feedback: {
        overall: feedback.overall ?? "",
        goodPoints: feedback.goodPoints ?? [],
        improvements: feedback.improvements ?? [],
        repeatedIssues: feedback.repeatedIssues ?? [],
        improvementsSinceLast: feedback.improvementsSinceLast ?? [],
        topicInsights: feedback.topicInsights ?? null,
        brushedUpText: feedback.brushedUpText ?? null,
        languageCorrections: feedback.languageCorrections ?? null,
        priorityImprovement: feedback.priorityImprovement ?? null,
        nextChallenge: feedback.nextChallenge ?? null,
        quantitativeAnalysis: feedback.quantitativeAnalysis ?? null,
      },
      targetUniversity: data.targetUniversity,
      targetFaculty: data.targetFaculty,
      attemptNumber,
      rootEssayId,
      parentEssayId,
      inputMode: data.inputMode ?? null,
      retryContext: data.retryContext ?? null,
      ...(retryComparison ? { retryComparison } : {}),
    });
  } catch (error) {
    console.error("Essay get error:", error);
    return NextResponse.json(
      { error: "取得処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
