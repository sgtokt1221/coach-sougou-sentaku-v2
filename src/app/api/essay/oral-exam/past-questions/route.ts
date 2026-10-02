import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { loadPastOralExamQuestions } from "@/lib/essay/oral-exam-question";

/**
 * GET /api/essay/oral-exam/past-questions
 * 自分がこれまでに出題された口頭試問の小問（お題ごと、新しい順、前回の判定つき）。
 * 解き直す小問を選ぶのに使う。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const groups = await loadPastOralExamQuestions(adminDb, uid);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Oral exam past questions GET error:", error);
    return NextResponse.json(
      { error: "これまでの小問を読み込めませんでした" },
      { status: 500 }
    );
  }
}
