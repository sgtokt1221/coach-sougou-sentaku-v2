import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  assertSessionAccess,
  getPreviousSessionWithAbsences,
} from "@/lib/api/session-auth";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/admin/sessions/[id]/previous-debrief
 *
 * 同一生徒の「前回実施した回」の反省点/次回議題/新弱点を返す。
 * 次回授業時に「前回の授業の反省点」として表示する用途。
 * 欠席回は getPreviousSession が飛ばすので、欠席した分の内容も次の実施回へ
 * 持ち越される。前回が無ければ null。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const snap = await adminDb.doc(`sessions/${id}`).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (!session.studentId) {
    return NextResponse.json({ previous: null, missedPreps: [] });
  }

  // 欠席回は飛ばすため、引き継ぎ元が直前の回とは限らない。
  // 講師が「なぜ前々回の内容が出ているのか」を判断できるよう欠席件数も返す。
  const { session: prev, skippedAbsences, missedSessions } =
    await getPreviousSessionWithAbsences(
      adminDb,
      session.studentId,
      session.scheduledAt,
    );

  // 欠席回に準備してあって実施できなかった台本。次の授業で消化するため返す。
  const missedPreps = missedSessions.map((s) => ({
    sessionId: s.id,
    scheduledAt: s.scheduledAt,
    theme: s.prepPlan?.theme ?? s.theme ?? "",
    goal: s.prepPlan?.goal ?? "",
    questions: s.prepPlan?.questions ?? [],
    cautions: s.prepPlan?.cautions ?? [],
  }));

  // 前回の debrief が無くても、未消化の台本があれば返す（全部欠席のケース）。
  const previous =
    prev && prev.debrief
      ? {
          sessionId: prev.id,
          scheduledAt: prev.scheduledAt,
          reflectionPoints: prev.debrief.reflectionPoints ?? [],
          nextAgendaSeed: prev.debrief.nextAgendaSeed ?? "",
          newWeaknessAreas: prev.debrief.newWeaknessAreas ?? [],
          skippedAbsences,
        }
      : null;

  return NextResponse.json({ previous, missedPreps });
}
