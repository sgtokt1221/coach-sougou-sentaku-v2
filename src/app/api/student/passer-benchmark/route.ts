import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { passerBenchmarkViewFor } from "@/lib/benchmark/passer-benchmark-server";

/**
 * GET /api/student/passer-benchmark
 * 自分の志望校の段の合格者ライン（水準と書き始めからの推移）。無ければ null。
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
    const user = await adminDb.doc(`users/${uid}`).get();
    const benchmark = await passerBenchmarkViewFor(
      adminDb,
      uid,
      user.get("targetUniversities")
    );
    return NextResponse.json({ benchmark });
  } catch (error) {
    console.error("passer-benchmark error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
