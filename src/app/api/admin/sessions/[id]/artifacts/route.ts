import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import { getSessionPeriodArtifacts } from "@/lib/api/session-artifacts";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/admin/sessions/[id]/artifacts
 * 講師/管理者向け。当該セッションの「前回〜今回」期間の生徒成果物を返す。
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
    return NextResponse.json({ error: "セッションに生徒が紐付いていません" }, { status: 400 });
  }

  const result = await getSessionPeriodArtifacts(adminDb, session.studentId, session);
  return NextResponse.json({ studentId: session.studentId, ...result });
}
