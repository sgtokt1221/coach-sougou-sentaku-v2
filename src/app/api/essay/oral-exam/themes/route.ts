import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { loadPastOralExamThemes } from "@/lib/essay/oral-exam-question";

/**
 * GET /api/essay/oral-exam/themes
 * 自分が口頭試問型で使ったお題（新しい順、重複なし）。テーマ欄の選択肢に使う。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const themes = await loadPastOralExamThemes(adminDb, uid);
    return NextResponse.json({ themes });
  } catch (error) {
    console.error("Oral exam themes GET error:", error);
    return NextResponse.json(
      { error: "お題を読み込めませんでした" },
      { status: 500 }
    );
  }
}
