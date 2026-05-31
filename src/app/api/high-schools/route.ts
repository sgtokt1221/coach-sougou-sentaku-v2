import { NextRequest, NextResponse } from "next/server";
import { ALL_HIGH_SCHOOLS } from "@/lib/data/highschools";

/**
 * GET /api/high-schools
 * 高校マスタ（近畿圏）を返す。出身高校の選択式入力に使用。
 * クエリ: ?prefecture=大阪府 / ?q=北野（名前部分一致）。いずれも任意。
 * マスタ読み取りのみのため role ゲートなし（オンボーディング中の生徒も叩く）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefecture = searchParams.get("prefecture");
  const q = searchParams.get("q")?.trim();

  let highSchools = ALL_HIGH_SCHOOLS;
  if (prefecture) {
    highSchools = highSchools.filter((s) => s.prefecture === prefecture);
  }
  if (q) {
    highSchools = highSchools.filter(
      (s) => s.name.includes(q) || s.prefecture.includes(q),
    );
  }

  return NextResponse.json({ highSchools });
}
