import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireRole } from "@/lib/api/auth";
import { buildOralExamQuestionPrompt } from "@/lib/ai/prompts/oral-exam-question";
import { OralExamQuestionSetOutputSchema } from "@/lib/ai/schemas/oral-exam-question";
import { AI_MODEL_REVIEW } from "@/lib/ai/prompt-versions";
import {
  ORAL_EXAM_MAX_QUESTIONS,
  ORAL_EXAM_MAX_WORDS,
  ORAL_EXAM_MIN_QUESTIONS,
  ORAL_EXAM_MIN_WORDS,
  normalizeOralExamQuestionSet,
} from "@/lib/essay/oral-exam-question";
import type { OralExamQuestionSet } from "@/lib/types/essay";

/** 作問はAI1回。生成待ちで打ち切られないようにする */
export const maxDuration = 60;

/**
 * POST /api/essay/oral-exam/generate
 * 生徒が入力したテーマから、口頭試問型の小問集合を作る。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  const totalWordLimit = Number(body.totalWordLimit);
  const questionCount = Number(body.questionCount);

  if (theme.length < 2 || theme.length > 100) {
    return NextResponse.json(
      { error: "テーマを2〜100字で入力してください" },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(totalWordLimit) ||
    totalWordLimit < ORAL_EXAM_MIN_WORDS ||
    totalWordLimit > ORAL_EXAM_MAX_WORDS
  ) {
    return NextResponse.json(
      {
        error: `合計字数は${ORAL_EXAM_MIN_WORDS}〜${ORAL_EXAM_MAX_WORDS}字で指定してください`,
      },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(questionCount) ||
    questionCount < ORAL_EXAM_MIN_QUESTIONS ||
    questionCount > ORAL_EXAM_MAX_QUESTIONS
  ) {
    return NextResponse.json(
      {
        error: `小問数は${ORAL_EXAM_MIN_QUESTIONS}〜${ORAL_EXAM_MAX_QUESTIONS}問で指定してください`,
      },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "出題の生成にはAPI設定が必要です" },
      { status: 503 }
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: AI_MODEL_REVIEW,
      max_tokens: 4000,
      system: buildOralExamQuestionPrompt({
        theme,
        totalWordLimit,
        questionCount,
      }),
      messages: [
        {
          role: "user",
          content: `テーマ「${theme}」で小問集合を作ってください。`,
        },
      ],
      output_config: {
        format: zodOutputFormat(OralExamQuestionSetOutputSchema),
      },
    });

    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      console.error("[oral-exam/generate] 構造化応答が不正", {
        stop_reason: response.stop_reason,
        usage: response.usage,
      });
      return NextResponse.json(
        { error: "問題を作れませんでした。もう一度お試しください" },
        { status: 502 }
      );
    }

    const raw: OralExamQuestionSet = {
      theme,
      totalWordLimit,
      subQuestions: response.parsed_output.subQuestions.map((q, i) => ({
        no: i + 1,
        prompt: q.prompt,
        wordLimit: q.wordLimit,
        aim: q.aim,
      })),
    };
    if (raw.subQuestions.length === 0) {
      return NextResponse.json(
        { error: "問題を作れませんでした。テーマを変えてお試しください" },
        { status: 502 }
      );
    }
    // 字数の合計はモデル任せにしない（ずれたまま通すと充足率の判定が狂う）
    const questionSet = normalizeOralExamQuestionSet(raw, totalWordLimit);

    return NextResponse.json({ questionSet });
  } catch (err) {
    console.error("[oral-exam/generate] failed:", err);
    return NextResponse.json(
      { error: "問題の生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
