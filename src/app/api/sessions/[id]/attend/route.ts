import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { sendFcmToUser } from "@/lib/chat/conversation";
import type { Session } from "@/lib/types/session";

/**
 * PATCH /api/sessions/[id]/attend
 * 生徒本人が自分の「欠席連絡」を取り消して出席(予定)に戻す。
 * 自分が報告した欠席のみ取り消し可。講師・担当管理者へ Push 通知する。
 */
export async function PATCH(
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

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;

  if (auth.uid !== session.studentId) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  // 自分が報告した欠席のみ取り消し可（管理者がつけた欠席は対象外）
  if (session.status !== "cancelled" || session.absenceReportedBy !== "student") {
    return NextResponse.json(
      { error: "このセッションは出席に戻せません" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  await ref.set(
    {
      status: "scheduled",
      absenceReportedBy: null,
      absenceReportedAt: null,
      updatedAt: now,
    },
    { merge: true },
  );

  // 通知 (失敗は握りつぶす)
  const when = new Date(session.scheduledAt);
  const whenLabel = Number.isNaN(when.getTime())
    ? ""
    : `${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  const title = "生徒が出席に戻しました";
  const body = `${session.studentName}さんが ${whenLabel} のセッションの欠席連絡を取り消しました`;
  const url = `/admin/sessions/${id}`;
  try {
    if (session.teacherId) await sendFcmToUser(session.teacherId, { title, body, url });
    const studentDoc = await adminDb.doc(`users/${session.studentId}`).get();
    const managedBy = studentDoc.data()?.managedBy as string | undefined;
    if (managedBy) await sendFcmToUser(managedBy, { title, body, url });
  } catch (err) {
    console.warn("[attend] notify failed:", err);
  }

  return NextResponse.json({
    ...session,
    status: "scheduled",
    absenceReportedBy: null,
    absenceReportedAt: null,
    updatedAt: now,
  });
}
