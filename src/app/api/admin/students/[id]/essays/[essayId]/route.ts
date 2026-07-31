import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Essay } from "@/lib/types/essay";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { id: studentId, essayId } = await params;

  if (!adminDb) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  try {
    const essayDoc = await adminDb.doc(`essays/${essayId}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json(
        { error: "エッセイが見つかりません" },
        { status: 404 }
      );
    }

    const data = essayDoc.data()!;

    // userId が対象生徒と一致することを確認
    if (data.userId !== studentId) {
      return NextResponse.json(
        { error: "この生徒のエッセイではありません" },
        { status: 403 }
      );
    }

    // 出題の文脈。retryContext は旧データでここに同じ情報が入っていることがあるため
    // フォールバックに使う。
    const ctx = (data.questionContext ?? data.retryContext ?? {}) as {
      questionType?: string | null;
      wordLimit?: number | null;
      sourceText?: string | null;
      chartDataSummary?: string | null;
      lectureInfo?: string | null;
      themeId?: string | null;
      pastQuestionId?: string | null;
    };

    // テーマ名が空の答案（保存していなかった時期のもの）は出題元から補う。
    let topic: string | undefined = data.topic || undefined;
    let topicEstimated = false;
    if (!topic && ctx.pastQuestionId) {
      const pq = getPastQuestionById(ctx.pastQuestionId);
      if (pq) topic = `${pq.universityName} ${pq.year}年 ${pq.theme}`;
    }
    if (!topic && ctx.themeId) {
      topic = getThemeById(ctx.themeId)?.title;
    }
    // それでも分からない答案は、提出時刻に最も近い下書きから推定する。
    // 講師がフィードバックを書くのに設問が要るため、空欄のままにはしない。
    if (!topic) {
      const submittedMs = data.submittedAt?.toDate?.()?.getTime?.() ?? 0;
      if (submittedMs) {
        try {
          const drafts = await adminDb!
            .collection(`users/${studentId}/essayDrafts`)
            .get();
          const nearest = drafts.docs
            .map((d) => {
              const y = d.data();
              return {
                themeId: y.themeId as string | undefined,
                pastQuestionId: y.pastQuestionId as string | undefined,
                diffMin:
                  Math.abs(
                    (y.updatedAt?.toDate?.()?.getTime?.() ?? 0) - submittedMs,
                  ) / 60000,
              };
            })
            .filter((y) => (y.themeId || y.pastQuestionId) && y.diffMin <= 120)
            .sort((a, b) => a.diffMin - b.diffMin)[0];
          if (nearest?.pastQuestionId) {
            const pq = getPastQuestionById(nearest.pastQuestionId);
            if (pq) {
              topic = `${pq.universityName} ${pq.year}年 ${pq.theme}`;
              topicEstimated = true;
            }
          } else if (nearest?.themeId) {
            const t = getThemeById(nearest.themeId)?.title;
            if (t) {
              topic = t;
              topicEstimated = true;
            }
          }
        } catch (err) {
          console.warn("[admin/essay] essayDrafts fetch failed:", err);
        }
      }
    }

    const essay: Essay = {
      id: essayDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl || "",
      ocrText: data.ocrText || "",
      targetUniversity: data.targetUniversity || "",
      targetFaculty: data.targetFaculty || "",
      topic,
      submittedAt: data.submittedAt?.toDate() || new Date(),
      status: data.status || "uploaded",
      scores: data.scores || undefined,
      feedback: data.feedback || undefined,
      inlineComments: data.inlineComments || [],
    };

    return NextResponse.json({
      ...essay,
      topicEstimated,
      questionContext: {
        questionType: ctx.questionType ?? null,
        wordLimit: ctx.wordLimit ?? null,
        sourceText: ctx.sourceText ?? null,
        chartDataSummary: ctx.chartDataSummary ?? null,
        lectureInfo: ctx.lectureInfo ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch essay:", error);
    return NextResponse.json(
      { error: "エッセイの取得に失敗しました" },
      { status: 500 }
    );
  }
}
