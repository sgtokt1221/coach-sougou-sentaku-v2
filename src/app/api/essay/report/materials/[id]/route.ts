import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import { getReportMaterialById } from "@/data/essay-report-materials";

/**
 * GET /api/essay/report/materials/[id]
 *
 * レポート課題文1件を本文（body）込みの全文で返す。
 * 該当 id がなければ 404 を返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;
  const material = getReportMaterialById(id);
  if (!material) {
    return NextResponse.json({ error: "課題文が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(material);
}
