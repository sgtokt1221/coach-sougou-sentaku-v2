import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  runResearchEvaluation,
  type ResearchEvaluateBody,
} from "@/lib/ai/research-evaluate";

/**
 * POST /api/research/evaluate
 * 「生徒が教える」発表の多モーダル講評（生徒の自己録音）。
 * 録音・AI処理は保護者同意(granted)が前提（同意ゲート）。評価本体は runResearchEvaluation を共用。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 同意ゲート
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    if (userDoc.data()?.researchConsentStatus !== "granted") {
      return NextResponse.json(
        { error: "録音・AI評価には保護者の同意が必要です。" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ResearchEvaluateBody;
    const { id, transcript, feedback } = await runResearchEvaluation({
      studentUid: uid,
      body,
      evaluatedBy: "student",
    });

    return NextResponse.json({ sessionId: id, transcript, feedback });
  } catch (error) {
    const message =
      error instanceof Error && /必要です/.test(error.message)
        ? error.message
        : "講評の生成中にエラーが発生しました";
    const status = message === "講評の生成中にエラーが発生しました" ? 500 : 400;
    if (status === 500) console.error("Research evaluate error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
