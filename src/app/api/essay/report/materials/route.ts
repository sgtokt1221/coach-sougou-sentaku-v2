import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import {
  getReportMaterialsByField,
  reportMaterials,
} from "@/data/essay-report-materials";

/**
 * GET /api/essay/report/materials
 *
 * レポート課題文の一覧を返す。`field` クエリで系統を絞り込める。
 * 一覧では本文（body）を含めない軽量版を返し、詳細は [id] ルートで取得する。
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const field = new URL(request.url).searchParams.get("field");
  const list = field ? getReportMaterialsByField(field) : reportMaterials;
  const items = list.map((m) => ({
    id: m.id,
    field: m.field,
    fieldLabel: m.fieldLabel,
    title: m.title,
    question: m.question,
    focusPoints: m.focusPoints,
    recommendedWordLimit: m.recommendedWordLimit,
    difficulty: m.difficulty,
  }));
  return NextResponse.json({ materials: items });
}
