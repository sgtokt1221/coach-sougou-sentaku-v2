import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { getSessionPeriodArtifacts } from "@/lib/api/session-artifacts";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/student/sessions/[id]/artifacts
 * 認証生徒本人の、当該セッションの「前回〜今回」期間の成果物を返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { id } = await params;

  const snap = await adminDb.doc(`sessions/${id}`).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  if (session.studentId !== auth.uid) {
    return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  }

  const result = await getSessionPeriodArtifacts(adminDb, session.studentId, session);
  return NextResponse.json({ studentId: session.studentId, ...result });
}
