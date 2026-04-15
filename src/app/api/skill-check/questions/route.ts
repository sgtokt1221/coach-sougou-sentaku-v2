import { NextRequest, NextResponse } from "next/server";
import {
  SKILL_CHECK_QUESTIONS,
  getQuestionsByCategory,
  pickRandomQuestion,
} from "@/lib/skill-check/questions";
import type { AcademicCategory } from "@/lib/types/skill-check";
import { ACADEMIC_CATEGORIES } from "@/lib/types/skill-check";

/**
 * GET /api/skill-check/questions
 *   ?category=<AcademicCategory>   必須（ただし未指定なら全問返却）
 *   ?random=1                      1問だけランダム取得
 *   ?exclude=<questionId>,<...>    random=1時に除外
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const random = searchParams.get("random") === "1";
  const exclude = (searchParams.get("exclude") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (category && !ACADEMIC_CATEGORIES.includes(category as AcademicCategory)) {
    return NextResponse.json({ error: "無効な系統です" }, { status: 400 });
  }

  if (random) {
    if (!category) {
      return NextResponse.json({ error: "category は必須です" }, { status: 400 });
    }
    const q = pickRandomQuestion(category as AcademicCategory, exclude);
    if (!q) return NextResponse.json({ error: "該当問題なし" }, { status: 404 });
    return NextResponse.json({ question: q });
  }

  const questions = category
    ? getQuestionsByCategory(category as AcademicCategory)
    : SKILL_CHECK_QUESTIONS;

  return NextResponse.json({ questions });
}
