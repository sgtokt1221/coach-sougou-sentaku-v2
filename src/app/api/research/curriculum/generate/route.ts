import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { generateAndSaveCurriculum } from "@/lib/ai/research-curriculum-generate";

interface GenerateBody {
  domain: string;
  theme: string;
  goal: string;
  unitCount: number;
}

/**
 * 生徒自身によるカリキュラム生成（受講登録必須）。
 * 現行フローでは生成は講師が行うため UI からは未使用だが、互換のため残置。
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
    const body = (await request.json()) as GenerateBody;
    const curriculum = await generateAndSaveCurriculum({
      studentUid: uid,
      domain: body.domain,
      theme: body.theme,
      goal: body.goal,
      unitCount: body.unitCount,
    });
    return NextResponse.json(curriculum);
  } catch (error) {
    const message =
      error instanceof Error && /必須です/.test(error.message)
        ? error.message
        : "カリキュラム生成中にエラーが発生しました";
    const status = message === "カリキュラム生成中にエラーが発生しました" ? 500 : 400;
    if (status === 500) console.error("Research curriculum generate error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
