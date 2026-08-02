import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { sendFcmToUser } from "@/lib/chat/conversation";
import type { Session } from "@/lib/types/session";

/**
 * PATCH /api/sessions/[id]/absent
 * 生徒本人が自分の予定セッションに欠席連絡する。
 * status を cancelled(=欠席) にし、担当講師と担当管理者へ Push 通知する。
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

  // 本人のみ
  if (auth.uid !== session.studentId) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  // 予定のみ欠席可
  if (session.status !== "scheduled") {
    return NextResponse.json(
      { error: "このセッションは欠席連絡できません" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  await ref.set(
    {
      status: "cancelled",
      absenceReportedBy: "student",
      absenceReportedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  // 通知 (失敗は握りつぶす)
  const when = new Date(session.scheduledAt);
  const whenLabel = Number.isNaN(when.getTime())
    ? ""
    : `${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  const title = "生徒が欠席連絡しました";
  const body = `${session.studentName}さんが ${whenLabel} のセッションを欠席連絡しました`;
  const url = `/admin/sessions/${id}`;

  try {
    if (session.teacherId) {
      await sendFcmToUser(session.teacherId, { title, body, url }, "attendance");
    }
    const studentDoc = await adminDb.doc(`users/${session.studentId}`).get();
    const managedBy = studentDoc.data()?.managedBy as string | undefined;
    if (managedBy) {
      await sendFcmToUser(managedBy, { title, body, url }, "attendance");
    }
  } catch (err) {
    console.warn("[absent] notify failed:", err);
  }

  const updated = { ...session, status: "cancelled", absenceReportedBy: "student", absenceReportedAt: now, updatedAt: now };
  return NextResponse.json(updated);
}
