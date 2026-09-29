import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { EssayDraft } from "@/lib/types/essay";
import { resolveDraftTopicLabel } from "@/lib/essay/draft-topic-label";

/**
 * 1人あたり残す下書きの数。自動保存は書いている間ずっと走るため、
 * 上限を決めないと書きかけが溜まり続け、履歴の「書きかけの下書き」から
 * 本人が目的のものを探せなくなる。古いものから消す。
 */
const DRAFT_KEEP_COUNT = 5;

/**
 * GET /api/student/essay-drafts
 * 自分の小論文下書き一覧（updatedAt 降順）。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }
    const snap = await adminDb
      .collection(`users/${uid}/essayDrafts`)
      .orderBy("updatedAt", "desc")
      .get();

    const drafts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        directText: data.directText ?? "",
        topic: data.topic ?? "",
        universityId: data.universityId ?? "",
        facultyId: data.facultyId ?? "",
        selectedCompoundId: data.selectedCompoundId ?? "",
        customMaxLength: data.customMaxLength,
        writingDirection: data.writingDirection,
        inputMode: "text",
        universityName: data.universityName ?? "",
        facultyName: data.facultyName ?? "",
        themeId: data.themeId,
        pastQuestionId: data.pastQuestionId,
        homeworkId: data.homeworkId,
        reportMaterialId: data.reportMaterialId,
        oralExam: data.oralExam,
        oralExamAnswers: data.oralExamAnswers,
        topicLabel: resolveDraftTopicLabel(data),
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ??
          (typeof data.createdAt === "string" ? data.createdAt : ""),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() ??
          (typeof data.updatedAt === "string" ? data.updatedAt : ""),
      } as EssayDraft;
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Essay drafts GET error:", error);
    return NextResponse.json(
      { error: "下書きの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/essay-drafts
 * 下書きの新規作成 or 更新（draftId 指定で更新）。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body = await request.json();
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { Timestamp } = await import("firebase-admin/firestore");
    const isNew = typeof body.draftId !== "string" || !body.draftId;
    // 保存時刻は応答で返し、次の保存の baseUpdatedAt にしてもらう。
    // serverTimestamp だと書いた値が分からないので、ここで決める
    const now = Timestamp.now();
    const draftId: string = isNew
      ? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : body.draftId;

    const data: Record<string, unknown> = {
      directText:
        typeof body.directText === "string"
          ? body.directText.slice(0, 20000)
          : "",
      topic: typeof body.topic === "string" ? body.topic.slice(0, 2000) : "",
      universityId: body.universityId ?? "",
      facultyId: body.facultyId ?? "",
      selectedCompoundId: body.selectedCompoundId ?? "",
      inputMode: "text",
      updatedAt: now,
    };
    if (typeof body.customMaxLength === "number")
      data.customMaxLength = body.customMaxLength;
    if (
      body.writingDirection === "vertical" ||
      body.writingDirection === "horizontal"
    )
      data.writingDirection = body.writingDirection;
    if (typeof body.universityName === "string")
      data.universityName = body.universityName;
    if (typeof body.facultyName === "string")
      data.facultyName = body.facultyName;
    if (typeof body.themeId === "string") data.themeId = body.themeId;
    if (typeof body.pastQuestionId === "string")
      data.pastQuestionId = body.pastQuestionId;
    if (typeof body.homeworkId === "string") data.homeworkId = body.homeworkId;
    if (typeof body.reportMaterialId === "string")
      data.reportMaterialId = body.reportMaterialId;
    /**
     * 口頭試問型の出題と書きかけの答え。
     * 出題はテーマから毎回AIが作るので、ここに保存しないと「続ける」で
     * 別の問題が出る（復元は毎回書かれる側を正本にする）。
     */
    if (body.oralExam && Array.isArray(body.oralExam.subQuestions))
      data.oralExam = body.oralExam;
    if (Array.isArray(body.oralExamAnswers))
      data.oralExamAnswers = body.oralExamAnswers.map((a: unknown) =>
        typeof a === "string" ? a : ""
      );
    if (isNew) data.createdAt = now;

    const ref = adminDb.doc(`users/${uid}/essayDrafts/${draftId}`);
    /**
     * 古い画面からの上書きを断る。
     *
     * 同じ下書きを2つの画面（タブ・端末）で開いていたり、端末に残った古い写しが
     * 復元されたりすると、古い本文が自動保存で新しい本文を黙って消していた
     * （本番で口頭試問の問2・問3が消えた）。画面は最後に読んだ・書いた版の
     * updatedAt を baseUpdatedAt として送り、サーバーの方が新しければ 409 を返す。
     * baseUpdatedAt が null なのは「版が分からない」なので、既存の下書きには書かない。
     * キー自体が無いのはこの仕組みより前の画面なので、これまでどおり通す。
     */
    const conflict = await adminDb.runTransaction(async (tx) => {
      if (!isNew && "baseUpdatedAt" in body) {
        const current = await tx.get(ref);
        const currentMs: number | undefined = current
          .data()
          ?.updatedAt?.toMillis?.();
        const baseMs =
          typeof body.baseUpdatedAt === "string"
            ? Date.parse(body.baseUpdatedAt)
            : NaN;
        if (
          current.exists &&
          currentMs !== undefined &&
          (Number.isNaN(baseMs) || currentMs > baseMs)
        ) {
          return new Date(currentMs).toISOString();
        }
      }
      tx.set(ref, data, { merge: true });
      return null;
    });
    if (conflict) {
      return NextResponse.json(
        {
          error:
            "この下書きは別の画面でより新しい内容が保存されています。下書き一覧から開き直してください",
          updatedAt: conflict,
        },
        { status: 409 }
      );
    }

    // 増えるのは新規作成のときだけ。更新は自動保存が数秒ごとに叩くので数えない
    if (isNew) {
      const snap = await adminDb
        .collection(`users/${uid}/essayDrafts`)
        .orderBy("updatedAt", "desc")
        .get();
      const stale = snap.docs.slice(DRAFT_KEEP_COUNT);
      if (stale.length > 0) {
        const batch = adminDb.batch();
        stale.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    return NextResponse.json({
      draftId,
      updatedAt: now.toDate().toISOString(),
    });
  } catch (error) {
    console.error("Essay drafts POST error:", error);
    return NextResponse.json(
      { error: "下書きの保存に失敗しました" },
      { status: 500 }
    );
  }
}
