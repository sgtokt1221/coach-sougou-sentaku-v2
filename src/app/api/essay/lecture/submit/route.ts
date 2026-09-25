import { NextRequest, NextResponse } from "next/server";
import { isMachineOnlyWeakness } from "@/lib/essay/derive-weakness-issues";
import {
  activeWeaknesses,
  loadWeaknessRecords,
  saveWeaknessRecords,
} from "@/lib/growth/weakness-store";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  reviewEssayCore,
  sentenceCheckFields,
  EssayReviewParseError,
} from "@/lib/essay/review-core";
import type { SentenceCheckResult } from "@/lib/essay/sentence-check-judge";
import {
  analyzeGrowth,
  hintsFromIssues,
  updateWeaknessRecords,
} from "@/lib/growth/analyze";
import { getLectureById } from "@/data/essay-lectures";
import { getEssayBlock } from "@/lib/types/essay-block";
import { getEssayForm, formStepsOf } from "@/lib/types/essay-form";
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
    const loadedWeaknesses = await loadWeaknessRecords(adminDb, uid);
    // 解決済み・アーカイブ済みは AI の文脈に入れない
    const existingWeaknesses = activeWeaknesses(loadedWeaknesses.records);
    // 字数・要求の欠落等は判定欄から機械的に積むので AI には渡さない
    // （渡すと今回の答案でもなぞって書き、判定と無関係に回数が増える）
    const weaknessesForAi = existingWeaknesses.filter(
      (w) => !isMachineOnlyWeakness(w)
    );
    const weaknessList =
      weaknessesForAi.length > 0
        ? weaknessesForAi.map((w) => `- ${w.area}(${w.count}回指摘)`).join("\n")
        : "(過去の弱点なし)";

    // essay ドキュメント作成 (sourceType="lecture")
    step = "create_essay";
    const essayId = `essay_lec_${lecture.id}_${Date.now()}`;
    const essayRef = adminDb.doc(`essays/${essayId}`);
    const topic = `小論文講座: ${lecture.title}`;
    // 1ブロックだけ書く課題は、答案全体を前提にした判定（字数・要求の欠落）を弱点にしない。
    // 答案にも保存し、後から講座データが変わっても提出当時の扱いで作り直せるようにする
    const partial = Boolean(lecture.exercise.blockId);
    const block = lecture.exercise.blockId
      ? getEssayBlock(lecture.exercise.blockId)
      : null;
    // 型のどのブロックを書かせたかを AI に伝える。ブロック1つだけの課題を
    // 完成答案として採点すると、構成が「途中で終わっている」と減点される。
    const blockInfo = block
      ? `この回答は答案全体ではなく、型の「${block.label}」ブロックだけを書く課題である（役割: ${block.role}）。完成答案として不足がある点は減点せず、このブロックとしての出来を見ること。`
      : "この回答は答案全体である。";
    // 設問タイプ別の型。書く順番と字数配分をそのまま AI へ伝える。
    // 型を伝えないと、資料型の「読み取り→解釈」の2段が構成の乱れに見える。
    const form = lecture.exercise.formId
      ? getEssayForm(lecture.exercise.formId)
      : null;
    const formInfo = form
      ? `この課題は「${form.name}」の答案である。書く順番と字数の目安: ${formStepsOf(
          form.id
        )
          .map((s) => `${s.label}${s.chars}字`)
          .join(
            " → "
          )}。この型で特に見るところ: ${form.focus}。よくある失敗: ${form.pitfall}。`
      : "";
    const lectureInfo = `講義「${lecture.title}」の関連問題。${blockInfo}${formInfo}重点的に評価する観点: ${lecture.exercise.focusPoints.join("、")}。設問: ${lecture.exercise.prompt}`;

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
      partial,
      attemptNumber: 1,
      rootEssayId: essayId,
      parentEssayId: null,
      retryContext: {
        questionType: form?.questionType ?? "lecture",
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
        ...(lecture.exercise.sourceText
          ? { sourceText: lecture.exercise.sourceText }
          : {}),
        ...(lecture.exercise.chartDataSummary
          ? { chartDataSummary: lecture.exercise.chartDataSummary }
          : {}),
      },
    });

    // AI 添削 (コア関数。基礎講座は大学AP非依存)
    step = "review";
    let scores: EssayScores;
    let feedback: EssayFeedback;
    let sentenceCheck: SentenceCheckResult | null = null;
    try {
      const coreResult = await reviewEssayCore({
        ocrText: answerText,
        topic,
        // 型が questionType を指定していればそれを使う（資料型は数値の読み違いを減点する）
        questionType: form?.questionType ?? "lecture",
        sourceText: lecture.exercise.sourceText,
        chartDataSummary: lecture.exercise.chartDataSummary,
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
        // 基礎講座は大学AP非依存。空値にしてAP軸を評価対象外にする。
        admissionPolicy: "",
        weaknessList,
        partial,
      });
      scores = coreResult.scores;
      feedback = coreResult.feedback;
      sentenceCheck = coreResult.sentenceCheck;
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

    // 助言の自由文は混ぜない（混ぜると誰にでも付く弱点に落ちる）
    const {
      tags: weaknessTags,
      categoryHints,
      detailHints,
    } = hintsFromIssues(feedback.repeatedIssues);
    const updatedWeaknesses = updateWeaknessRecords(
      loadedWeaknesses.records,
      weaknessTags,
      {
        source: "essay",
        categoryHints,
        detailHints,
        // 型の1ブロックだけを書く課題は答案全体を見ていない。挙がらなかった弱点を
        // 「指摘されなかった」と数えると、結論を書いていない課題で結論の弱点が解決する
        countMisses: !lecture.exercise.blockId,
      }
    );
    const growthEvents = analyzeGrowth(
      weaknessTags,
      existingWeaknesses,
      "essay"
    );

    // 採点結果を essay に書き込み
    step = "save_result";
    await essayRef.set(
      {
        scores,
        feedback,
        // 点検由来の弱点を表示・作り直しで再現できるように点検結果も残す
        ...sentenceCheckFields(sentenceCheck, "review"),
        weaknessTags,
        status: "reviewed",
        reviewedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 弱点 DB 更新
    step = "update_weaknesses";
    await saveWeaknessRecords(
      adminDb,
      uid,
      loadedWeaknesses,
      updatedWeaknesses
    );

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
