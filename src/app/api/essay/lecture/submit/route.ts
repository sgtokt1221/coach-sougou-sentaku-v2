import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  reviewEssayCore,
  EssayReviewParseError,
} from "@/lib/essay/review-core";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import { getLectureById } from "@/data/essay-lectures";
import { getEssayBlock } from "@/lib/types/essay-block";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { EssayScores, EssayFeedback } from "@/lib/types/essay";

/**
 * POST /api/essay/lecture/submit
 *
 * 小論文講座の「関連問題」の回答を採点する。
 * 宿題提出 (POST /api/student/homework/[id]/submit) と同じく、回答を essays に1件作って
 * 既存の AI 添削コア (reviewEssayCore) で採点する。これにより:
 * - 生徒・管理者の「添削履歴」に講座の回答が普通に並ぶ (sourceType="lecture" で区別)
 * - 成長グラフ・弱点分析が自動更新される
 * 採点軸は通常の小論文と同じ EssayScores 5観点。講義の重点スキルは lectureInfo で AI に伝える。
 */

interface LectureSubmitBody {
  lectureId: string;
  answerText: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore に接続できません" },
      { status: 500 }
    );
  }

  let step = "start";
  try {
    step = "parse_body";
    const body = (await request
      .json()
      .catch(() => null)) as LectureSubmitBody | null;
    if (!body?.lectureId || typeof body.answerText !== "string") {
      return NextResponse.json(
        { error: "lectureId と answerText は必須です" },
        { status: 400 }
      );
    }

    const lecture = getLectureById(body.lectureId);
    if (!lecture) {
      return NextResponse.json(
        { error: "講義が見つかりません" },
        { status: 404 }
      );
    }

    const answerText = body.answerText.trim();
    const minLength = lecture.exercise.minLength ?? 20;
    if (answerText.length < minLength) {
      return NextResponse.json(
        { error: `回答が短すぎます (${minLength}文字以上書いてください)` },
        { status: 400 }
      );
    }

    // 弱点 DB 読み込み
    step = "load_weaknesses";
    let existingWeaknesses: WeaknessRecord[] = [];
    const weaknessDocs = await adminDb
      .collection(`users/${uid}/weaknesses`)
      .where("resolved", "==", false)
      .get();
    if (!weaknessDocs.empty) {
      existingWeaknesses = weaknessDocs.docs.map((d) => {
        const w = d.data();
        return {
          area: w.area,
          count: w.count,
          firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
          lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
          improving: w.improving ?? false,
          resolved: w.resolved ?? false,
          source: w.source ?? "essay",
          reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
        } satisfies WeaknessRecord;
      });
    }
    const weaknessList =
      existingWeaknesses.length > 0
        ? existingWeaknesses
            .map((w) => `- ${w.area}(${w.count}回指摘)`)
            .join("\n")
        : "(過去の弱点なし)";

    // 自己分析 (任意)
    step = "load_self_analysis";
    let essaySelfAnalysis;
    try {
      const saDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
      if (saDoc.exists) {
        const sa = saDoc.data()!;
        essaySelfAnalysis = {
          values: sa.values?.coreValues,
          strengths: sa.strengths?.strengths,
          vision: sa.vision?.longTermVision,
          selfStatement: sa.identity?.selfStatement,
        };
      }
    } catch {
      // 取れなくても続行
    }

    // essay ドキュメント作成 (sourceType="lecture")
    step = "create_essay";
    const essayId = `essay_lec_${lecture.id}_${Date.now()}`;
    const essayRef = adminDb.doc(`essays/${essayId}`);
    const topic = `小論文講座: ${lecture.title}`;
    const block = lecture.exercise.blockId
      ? getEssayBlock(lecture.exercise.blockId)
      : null;
    // 型のどのブロックを書かせたかを AI に伝える。ブロック1つだけの課題を
    // 完成答案として採点すると、構成が「途中で終わっている」と減点される。
    const blockInfo = block
      ? `この回答は答案全体ではなく、型の「${block.label}」ブロックだけを書く課題である（役割: ${block.role}）。完成答案として不足がある点は減点せず、このブロックとしての出来を見ること。`
      : "この回答は答案全体である。";
    const lectureInfo = `講義「${lecture.title}」の関連問題。${blockInfo}重点的に評価する観点: ${lecture.exercise.focusPoints.join("、")}。設問: ${lecture.exercise.prompt}`;

    await essayRef.set({
      userId: uid,
      ocrText: answerText,
      imageUrl: "",
      targetUniversity: "",
      targetFaculty: "",
      topic,
      submittedAt: new Date(),
      status: "reviewing",
      inputMode: "text",
      sourceType: "lecture",
      lectureId: lecture.id,
      attemptNumber: 1,
      rootEssayId: essayId,
      parentEssayId: null,
      retryContext: {
        questionType: "lecture",
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
      },
    });

    // AI 添削 (コア関数。基礎講座は大学AP非依存)
    step = "review";
    let scores: EssayScores;
    let feedback: EssayFeedback;
    try {
      const coreResult = await reviewEssayCore({
        ocrText: answerText,
        topic,
        questionType: "lecture",
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
        // 基礎講座は大学AP非依存。空値にしてAP軸を評価対象外にする。
        admissionPolicy: "",
        weaknessList,
        essaySelfAnalysis,
      });
      scores = coreResult.scores;
      feedback = coreResult.feedback;
    } catch (err) {
      if (err instanceof EssayReviewParseError) {
        return NextResponse.json(
          {
            error: "AI添削結果のパースに失敗しました",
            rawResponse: err.rawText.slice(0, 500),
          },
          { status: 500 }
        );
      }
      throw err;
    }

    const weaknessTags: string[] = [
      ...feedback.repeatedIssues.map((i) => i.area),
      ...feedback.improvements,
    ];
    const updatedWeaknesses = updateWeaknessRecords(
      existingWeaknesses,
      weaknessTags
    );
    const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

    // 採点結果を essay に書き込み
    step = "save_result";
    await essayRef.set(
      {
        scores,
        feedback,
        weaknessTags,
        status: "reviewed",
        reviewedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 弱点 DB 更新
    step = "update_weaknesses";
    for (const w of updatedWeaknesses) {
      await adminDb.doc(`users/${uid}/weaknesses/${w.area}`).set(
        {
          area: w.area,
          count: w.count,
          firstOccurred: w.firstOccurred,
          lastOccurred: w.lastOccurred,
          improving: w.improving,
          resolved: w.resolved,
          source: w.source,
          reminderDismissedAt: w.reminderDismissedAt,
        },
        { merge: true }
      );
    }

    return NextResponse.json({ essayId, scores, feedback, growthEvents });
  } catch (error) {
    console.error(`[essay/lecture/submit] step=${step} error:`, error);
    return NextResponse.json(
      {
        error: "講座問題の採点中にエラーが発生しました",
        detail: error instanceof Error ? error.message : String(error),
        step,
      },
      { status: 500 }
    );
  }
}
