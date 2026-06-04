import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess, getPreviousSession } from "@/lib/api/session-auth";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/admin/sessions/[id]/previous-debrief
 *
 * 同一生徒の「前回セッション」の反省点/次回議題/新弱点を返す。
 * 次回授業時に「前回の授業の反省点」として表示する用途。前回が無ければ null。
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
    return NextResponse.json({ previous: null });
  }

  const prev = await getPreviousSession(adminDb, session.studentId, session.scheduledAt);
  if (!prev || !prev.debrief) {
    return NextResponse.json({ previous: null });
  }

  return NextResponse.json({
    previous: {
      sessionId: prev.id,
      scheduledAt: prev.scheduledAt,
      reflectionPoints: prev.debrief.reflectionPoints ?? [],
      nextAgendaSeed: prev.debrief.nextAgendaSeed ?? "",
      newWeaknessAreas: prev.debrief.newWeaknessAreas ?? [],
    },
  });
}
