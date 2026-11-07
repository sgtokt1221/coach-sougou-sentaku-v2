import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { allPasserBenchmarkViews } from "@/lib/benchmark/passer-benchmark-server";

/**
 * GET /api/student/passer-benchmark
 * 合格者ライン（水準と書き始めからの推移）。志望校に関係なく、ラインのある段を全部返す。
 * 合格者の人数・名前・大学名は返さない。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const benchmarks = await allPasserBenchmarkViews(adminDb, uid);
    return NextResponse.json({ benchmarks });
  } catch (error) {
    console.error("passer-benchmark error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
