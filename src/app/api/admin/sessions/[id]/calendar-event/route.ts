import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import {
  createEventWithMeet,
  deleteEvent,
  getAuthedClient,
  updateEvent,
} from "@/lib/google/calendar-client";
import type { Session } from "@/lib/types/session";

const SESSION_TYPE_LABEL: Record<string, string> = {
  coaching: "個別コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

function buildEventTimes(session: Session): {
  startIso: string;
  endIso: string;
} {
  const start = new Date(session.scheduledAt);
  const durMin =
    typeof session.duration === "number" && session.duration > 0
      ? session.duration
      : 60;
  const end = new Date(start.getTime() + durMin * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function fetchStudentEmail(
  db: FirebaseFirestore.Firestore,
  studentId: string,
): Promise<string | null> {
  try {
    const d = await db.doc(`users/${studentId}`).get();
    const email = d.data()?.email as string | undefined;
    return email ?? null;
  } catch {
    return null;
  }
}

function buildSummary(session: Session): string {
  const type = SESSION_TYPE_LABEL[session.type] ?? "授業";
  return `${type}: ${session.studentName ?? ""}`.trim();
}

function buildDescription(session: Session): string {
  const parts: string[] = [];
  if (session.prepPlan?.goal) parts.push(`今日のゴール: ${session.prepPlan.goal}`);
  if (session.notes) parts.push(session.notes);
  return parts.join("\n\n");
}

/** 後付けでセッションに Calendar event を作成 */
export async function POST(
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

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  const authedClient = await getAuthedClient(adminDb, session.teacherId ?? auth.uid);
  if (!authedClient) {
    return NextResponse.json(
      { error: "Google Calendar が連携されていません" },
      { status: 400 },
    );
  }

  const { startIso, endIso } = buildEventTimes(session);
  const studentEmail = session.studentId
    ? await fetchStudentEmail(adminDb, session.studentId)
    : null;

  try {
    const { eventId, meetLink } = await createEventWithMeet(authedClient.client, {
      summary: buildSummary(session),
      description: buildDescription(session),
      startIso,
      endIso,
      attendeeEmails: studentEmail ? [studentEmail] : undefined,
    });
    await ref.set(
      {
        calendarEventId: eventId,
        meetLink: meetLink ?? session.meetLink ?? null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return NextResponse.json({ calendarEventId: eventId, meetLink });
  } catch (err) {
    console.error("[calendar-event] create failed:", err);
    return NextResponse.json(
      { error: "Calendar イベントの作成に失敗しました" },
      { status: 500 },
    );
  }
}

/** PATCH: 日時変更時 Calendar を同期 */
export async function PATCH(
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

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (!session.calendarEventId) {
    return NextResponse.json(
      { error: "Calendar イベントがありません" },
      { status: 400 },
    );
  }
  const authedClient = await getAuthedClient(adminDb, session.teacherId ?? auth.uid);
  if (!authedClient) {
    return NextResponse.json(
      { error: "Google Calendar が連携されていません" },
      { status: 400 },
    );
  }

  const { startIso, endIso } = buildEventTimes(session);
  try {
    await updateEvent(authedClient.client, session.calendarEventId, {
      summary: buildSummary(session),
      description: buildDescription(session),
      startIso,
      endIso,
      status: session.status === "cancelled" ? "cancelled" : "confirmed",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar-event] update failed:", err);
    return NextResponse.json(
      { error: "Calendar イベントの更新に失敗しました" },
      { status: 500 },
    );
  }
}

/** DELETE: Calendar event を削除 */
export async function DELETE(
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

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (!session.calendarEventId) {
    return NextResponse.json({ ok: true });
  }
  const authedClient = await getAuthedClient(adminDb, session.teacherId ?? auth.uid);
  if (!authedClient) {
    return NextResponse.json(
      { error: "Google Calendar が連携されていません" },
      { status: 400 },
    );
  }

  try {
    await deleteEvent(authedClient.client, session.calendarEventId);
    await ref.set(
      {
        calendarEventId: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar-event] delete failed:", err);
    return NextResponse.json(
      { error: "Calendar イベントの削除に失敗しました" },
      { status: 500 },
    );
  }
}
