import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ResearchCurriculum } from "@/lib/types/research";

interface DecideBody {
  domain: string;
  theme: string;
  goal: string;
}

/**
 * POST /api/research/curriculum/decide
 * 生徒が問答で決めた探究分野/テーマ/ゴールを draft として保存する。
 * 実際のカリキュラム生成は講師が初回セッションで行う。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const userSnap = await adminDb.doc(`users/${uid}`).get();
  if (userSnap.data()?.researchEnrolled !== true) {
    return NextResponse.json({ error: "探究授業の受講登録がありません。" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as DecideBody;
    const domain = (body.domain ?? "").trim();
    const theme = (body.theme ?? "").trim();
    const goal = (body.goal ?? "").trim();
    if (!theme) {
      return NextResponse.json({ error: "テーマは必須です" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const draft: ResearchCurriculum = {
      domain,
      theme,
      goal,
      totalUnits: 0,
      units: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    // 既存 active を上書きしないよう、active がある場合は draft 化しない
    const ref = adminDb.doc(`users/${uid}/researchCurriculum/current`);
    const existing = (await ref.get()).data() as ResearchCurriculum | undefined;
    if (existing?.status === "active") {
      return NextResponse.json(existing);
    }
    await ref.set(draft);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Research curriculum decide error:", error);
    return NextResponse.json({ error: "保存中にエラーが発生しました" }, { status: 500 });
  }
}
