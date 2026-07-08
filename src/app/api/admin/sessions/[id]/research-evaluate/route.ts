import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  runResearchEvaluation,
  type ResearchEvaluateBody,
} from "@/lib/ai/research-evaluate";
import type { Session } from "@/lib/types/session";
import type { ResearchCurriculum } from "@/lib/types/research";

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

    // セッション認可（自塾の admin は代行可、superadmin は全許可）
    const denied = await assertSessionAccess(adminDb, session, { uid, role });
    if (denied) return denied;

    const studentSnap = await adminDb.doc(`users/${studentId}`).get();
    const studentData = studentSnap.data();
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

    // カリキュラムの「今回のユニット」を done にして当該セッションに紐付ける
    try {
      const curRef = adminDb.doc(`users/${studentId}/researchCurriculum/current`);
      const curSnap = await curRef.get();
      if (curSnap.exists) {
        const cur = curSnap.data() as ResearchCurriculum;
        const units = cur.units ?? [];
        const target =
          units.find((u) => u.sessionId === id) ??
          units.find((u) => u.status !== "done");
        if (target) {
          const updated = units.map((u) =>
            u.order === target.order
              ? { ...u, status: "done" as const, sessionId: id }
              : u
          );
          await curRef.set(
            { units: updated, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }
      }
    } catch (e) {
      console.warn("[research] curriculum unit update failed:", e);
    }

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
