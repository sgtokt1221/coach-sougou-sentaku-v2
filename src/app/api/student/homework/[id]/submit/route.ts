import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  reviewEssayCore,
  EssayReviewParseError,
} from "@/lib/essay/review-core";
import {
  scoreInterviewCore,
  InterviewScoreParseError,
} from "@/lib/interview/score-core";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { HomeworkAssignment } from "@/lib/types/homework";
import type { EssayScores, EssayFeedback } from "@/lib/types/essay";
import type {
  InterviewScores,
  InterviewFeedback,
  InterviewMessage,
} from "@/lib/types/interview";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";

/**
 * POST /api/student/homework/[id]/submit
 *
 * 宿題の提出。
 *
 * ハイブリッド設計の核心:
 * - 提出本文を essays/interviews コレクションに直接書き込む (sourceType="homework" 付き)
 * - 既存の AI 添削 core 関数を呼んでスコア算出 → 既存ロジックと完全に同じ採点
 * - 弱点 DB 更新も既存 essays/interviews 添削と同じく実行
 * - homeworkAssignment.status = "submitted" にし、提出 ID を埋め込む
 *
 * これにより:
 * - 生徒の essay/interview 履歴に「宿題提出」が普通に並ぶ
 * - 成長グラフ・弱点分析が自動更新
 * - 次回成長レポート生成で宿題提出物も期間内集計対象に
 */

interface EssaySubmitBody {
  type: "essay";
  body: string;
}

interface InterviewSubmitBody {
  type: "interview";
  /** 生徒の回答テキスト (録音版は文字起こし結果) */
  answer: string;
}

type SubmitBody = EssaySubmitBody | InterviewSubmitBody;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
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
    step = "load_homework";
    const { id } = await params;
    const hwRef = adminDb.doc(`users/${uid}/homeworkAssignments/${id}`);
    const hwSnap = await hwRef.get();
    if (!hwSnap.exists) {
      return NextResponse.json(
        { error: "宿題が見つかりません" },
        { status: 404 }
      );
    }
    const hw = hwSnap.data() as HomeworkAssignment;
    if (hw.status === "submitted" || hw.status === "reviewed") {
      return NextResponse.json(
        { error: "この宿題は既に提出済みです" },
        { status: 400 }
      );
    }

    step = "parse_body";
    const body = (await request.json()) as SubmitBody;
    if (body.type !== hw.snapshot.type) {
      return NextResponse.json(
        { error: `宿題の種別 (${hw.snapshot.type}) と一致しません` },
        { status: 400 }
      );
    }

    // 大学・学部の AP コンテキストを取得 (snapshot に保存済み)
    step = "load_context";
    let admissionPolicy = "";
    let universityName = "(大学名未設定)";
    let facultyName = "(学部名未設定)";
    if (hw.snapshot.targetUniversity) {
      const univSnap = await adminDb
        .doc(`universities/${hw.snapshot.targetUniversity}`)
        .get();
      if (univSnap.exists) {
        const univData = univSnap.data()!;
        universityName = univData.name ?? universityName;
        const faculty = (univData.faculties ?? []).find(
          (f: { id: string }) => f.id === hw.snapshot.targetFaculty
        );
        if (faculty) {
          facultyName = faculty.name ?? facultyName;
          if (faculty.admissionPolicy) {
            const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
            admissionPolicy = prepared.text
              ? `大学: ${universityName}\n学部: ${facultyName}\nAP: ${prepared.text}`
              : "";
          }
        }
      }
    }

    // 弱点 DB
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

    // 種別ごとに処理
    if (body.type === "essay") {
      return await submitEssay({
        uid,
        homework: hw,
        homeworkRef: hwRef,
        bodyText: body.body,
        admissionPolicy,
        weaknessList,
        existingWeaknesses,
      });
    } else {
      return await submitInterview({
        uid,
        homework: hw,
        homeworkRef: hwRef,
        answer: body.answer,
        admissionPolicy,
        universityName,
        facultyName,
        existingWeaknesses,
      });
    }
  } catch (error) {
    console.error(`[homework/submit] step=${step} error:`, error);
    return NextResponse.json(
      {
        error: "宿題提出中にエラーが発生しました",
        detail: error instanceof Error ? error.message : String(error),
        step,
      },
      { status: 500 }
    );
  }
}

async function submitEssay(args: {
  uid: string;
  homework: HomeworkAssignment;
  homeworkRef: FirebaseFirestore.DocumentReference;
  bodyText: string;
  admissionPolicy: string;
  weaknessList: string;
  existingWeaknesses: WeaknessRecord[];
}): Promise<NextResponse> {
  const {
    uid,
    homework,
    homeworkRef,
    bodyText,
    admissionPolicy,
    weaknessList,
    existingWeaknesses,
  } = args;

  if (!bodyText || bodyText.trim().length < 20) {
    return NextResponse.json(
      { error: "本文が短すぎます (20文字以上書いてください)" },
      { status: 400 }
    );
  }

  // essay ドキュメントを作成 (sourceType=homework 付き)
  const essayId = `essay_hw_${homework.id}_${Date.now()}`;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore 未接続" }, { status: 500 });
  }
  const essayRef = adminDb.doc(`essays/${essayId}`);

  /**
   * 出題の条件を復元する。
   *
   * 宿題経由の提出は questionType も wordLimit も渡しておらず、通常の提出と
   * 同じ答案でも採点が変わっていた（資料つき設問の読解評価も、字数の充足率
   * 判定も効かない）。配布時の snapshot に出題元IDが残っているので、そこから
   * 通常提出と同じ条件を組み立てる。
   */
  const themeSource = homework.snapshot.essayThemeId
    ? getThemeById(homework.snapshot.essayThemeId)
    : undefined;
  const pastSource = homework.snapshot.pastQuestionId
    ? getPastQuestionById(homework.snapshot.pastQuestionId)
    : undefined;
  const questionType = themeSource?.questionType ?? pastSource?.questionType;
  const wordLimit = themeSource?.wordLimit ?? pastSource?.wordLimit;
  const sourceText = themeSource?.sourceText ?? pastSource?.sourceText;
  const chartDataSummary = themeSource?.chartData
    ? JSON.stringify(themeSource.chartData)
    : undefined;

  await essayRef.set({
    userId: uid,
    ocrText: bodyText,
    imageUrl: "",
    targetUniversity: homework.snapshot.targetUniversity ?? "",
    targetFaculty: homework.snapshot.targetFaculty ?? "",
    topic: homework.snapshot.title,
    submittedAt: new Date(),
    status: "reviewing",
    inputMode: "text",
    sourceType: "homework",
    homeworkAssignmentId: homework.id,
    attemptNumber: 1,
    rootEssayId: essayId,
    parentEssayId: null,
    // 何に答えたかを残す。通常提出と同じ形（管理者画面と再採点で使う）
    questionContext: {
      questionType: questionType ?? null,
      wordLimit: wordLimit ?? null,
      sourceText: sourceText ?? null,
      chartDataSummary: chartDataSummary ?? null,
      lectureInfo: null,
      pastQuestionFacultyName: pastSource?.facultyName ?? null,
      themeId: homework.snapshot.essayThemeId ?? null,
      pastQuestionId: homework.snapshot.pastQuestionId ?? null,
    },
  });

  // 自己分析
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

  // AI 添削 (core 関数経由)
  let scores: EssayScores;
  let feedback: EssayFeedback;
  try {
    const coreResult = await reviewEssayCore({
      ocrText: bodyText,
      topic: homework.snapshot.title,
      questionType,
      wordLimit,
      sourceText,
      chartDataSummary,
      admissionPolicy,
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

  // essay に結果を書き込み
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

  // homeworkAssignment ステータス更新
  await homeworkRef.update({
    status: "submitted",
    submittedEssayId: essayId,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    essayId,
    scores,
    feedback,
    growthEvents,
  });
}

async function submitInterview(args: {
  uid: string;
  homework: HomeworkAssignment;
  homeworkRef: FirebaseFirestore.DocumentReference;
  answer: string;
  admissionPolicy: string;
  universityName: string;
  facultyName: string;
  existingWeaknesses: WeaknessRecord[];
}): Promise<NextResponse> {
  const {
    uid,
    homework,
    homeworkRef,
    answer,
    admissionPolicy,
    universityName,
    facultyName,
    existingWeaknesses,
  } = args;

  if (!answer || answer.trim().length < 10) {
    return NextResponse.json(
      { error: "回答が短すぎます (10文字以上書いてください)" },
      { status: 400 }
    );
  }

  // 単発 1問1答の interviews ドキュメント
  const interviewId = `interview_hw_${homework.id}_${Date.now()}`;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore 未接続" }, { status: 500 });
  }
  const interviewRef = adminDb.doc(`interviews/${interviewId}`);

  const messages: InterviewMessage[] = [
    { role: "ai", content: homework.snapshot.title },
    { role: "student", content: answer },
  ];

  await interviewRef.set({
    userId: uid,
    targetUniversity: homework.snapshot.targetUniversity ?? "",
    targetFaculty: homework.snapshot.targetFaculty ?? "",
    mode: "individual",
    startedAt: new Date(),
    duration: 0,
    messages,
    status: "in_progress",
    aiModel: "claude-sonnet-4-6",
    sourceType: "homework",
    homeworkAssignmentId: homework.id,
    universityContext: {
      universityName,
      facultyName,
      admissionPolicy: admissionPolicy.replace(/^.+AP: /, ""),
    },
  });

  // 自己分析 (面接版)
  let selfAnalysisContext = "";
  try {
    const saDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (saDoc.exists) {
      const sa = saDoc.data()!;
      const parts: string[] = [];
      if (sa.values?.coreValues)
        parts.push(`価値観: ${sa.values.coreValues.join("、")}`);
      if (sa.strengths?.strengths)
        parts.push(`強み: ${sa.strengths.strengths.join("、")}`);
      if (sa.vision?.shortTermGoal)
        parts.push(`短期目標: ${sa.vision.shortTermGoal}`);
      if (sa.identity?.selfStatement)
        parts.push(`自己像: ${sa.identity.selfStatement}`);
      if (parts.length > 0) selfAnalysisContext = parts.join("\n");
    }
  } catch {
    // 取れなくても続行
  }

  // AI スコアリング
  let scores: InterviewScores;
  let feedback: InterviewFeedback;
  let conversationSummary;
  try {
    const coreResult = await scoreInterviewCore({
      messages,
      universityName,
      facultyName,
      admissionPolicy,
      mode: "individual",
      selfAnalysisContext: selfAnalysisContext || undefined,
    });
    scores = coreResult.scores;
    feedback = coreResult.feedback;
    conversationSummary = coreResult.conversationSummary;
  } catch (err) {
    if (err instanceof InterviewScoreParseError) {
      return NextResponse.json(
        {
          error: "AI評価結果のパースに失敗しました",
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
    weaknessTags,
    "interview"
  );
  const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

  await interviewRef.update({
    scores,
    feedback,
    conversationSummary,
    weaknessTags,
    status: "completed",
    completedAt: FieldValue.serverTimestamp(),
  });

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

  await homeworkRef.update({
    status: "submitted",
    submittedInterviewId: interviewId,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    interviewId,
    scores,
    feedback,
    growthEvents,
  });
}
