import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  runResearchEvaluation,
  type ResearchEvaluateBody,
} from "@/lib/ai/research-evaluate";
import type { Session } from "@/lib/types/session";

/**
 * POST /api/admin/sessions/[id]/research-evaluate
 * 講師がセッション画面でその場録音した探究発表を評価し、生徒の researchSessions に保存する。
 * 評価結果は users/{studentId}/researchSessions に sessionId 紐付け・evaluatedBy:"teacher" で保存。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;
  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const sessionSnap = await adminDb.doc(`sessions/${id}`).get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = sessionSnap.data() as Session;
    const studentId = session.studentId;
    if (!studentId) {
      return NextResponse.json({ error: "生徒が設定されていません" }, { status: 400 });
    }

    const studentSnap = await adminDb.doc(`users/${studentId}`).get();
    const studentData = studentSnap.data();
    // 担当生徒のみ（superadmin は全許可）
    if (role !== "superadmin" && studentData?.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒のセッションを評価する権限がありません" },
        { status: 403 }
      );
    }
    // 録音・AI評価は保護者同意が前提
    if (studentData?.researchConsentStatus !== "granted") {
      return NextResponse.json(
        { error: "録音・AI評価には保護者の同意が必要です。" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ResearchEvaluateBody;
    const result = await runResearchEvaluation({
      studentUid: studentId,
      body,
      sessionId: id,
      evaluatedBy: "teacher",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && /必要です/.test(error.message)
        ? error.message
        : "講評の生成中にエラーが発生しました";
    const status = message === "講評の生成中にエラーが発生しました" ? 500 : 400;
    if (status === 500) console.error("Admin research evaluate error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
