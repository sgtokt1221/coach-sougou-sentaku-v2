import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { Session, SessionType } from "@/lib/types/session";

const TYPE_LABEL: Record<SessionType, string> = {
  coaching: "コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

/**
 * セッション作成・参加追加時に生徒へ FCM Push 通知を送る。
 * トークン未登録なら何もしない。失敗は静かに無視 (本処理を妨げない)。
 */
async function notifyStudentOfSession(
  studentId: string,
  session: { id: string; scheduledAt: string; teacherName?: string; type: SessionType },
): Promise<void> {
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return;
    const tokensSnap = await adminDb
      .collection(`users/${studentId}/fcmTokens`)
      .get();
    if (tokensSnap.empty) return;

    const { getMessaging } = await import("firebase-admin/messaging");
    const messaging = getMessaging();

    const tokens = tokensSnap.docs.map((d) => d.data().token as string);
    const d = new Date(session.scheduledAt);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const datePart = `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
    const timePart = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const teacher = session.teacherName ? ` / ${session.teacherName}` : "";
    const typeLabel = TYPE_LABEL[session.type] ?? "面談";
    const link = `/student/sessions/${session.id}`;

    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: "新しい面談が予定されました",
        body: `${datePart} ${timePart} - ${typeLabel}${teacher}`,
      },
      data: { url: link, sessionId: session.id },
      webpush: { fcmOptions: { link } },
    });
  } catch (err) {
    console.warn("[sessions] FCM notification failed:", err);
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;

  const { uid, role } = authResult;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const studentId = searchParams.get("studentId");
  const teacherId = searchParams.get("teacherId");
  const sharedOnly = searchParams.get("sharedWithStudent");

  // viewAs support for superadmin
  const viewAs = searchParams.get("viewAs");
  const effectiveUid =
    role === "superadmin" && viewAs ? viewAs : uid;
  const effectiveRole =
    role === "superadmin" && viewAs ? "admin" : role;

  let sessions: Session[] = [];

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await adminDb.collection("sessions").get();
    if (!snap.empty) {
      sessions = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Session
      );
    }
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "セッションの取得に失敗しました" }, { status: 500 });
  }

  // ロールベーススコーピング
  if (effectiveRole === "teacher") {
    sessions = sessions.filter((s) => s.teacherId === effectiveUid);
  } else if (effectiveRole === "admin") {
    sessions = sessions.filter((s) => s.createdByAdminId === effectiveUid);
  }
  // superadmin（viewAsなし）: 全件

  if (status) {
    sessions = sessions.filter((s) => s.status === status);
  }
  if (studentId) {
    sessions = sessions.filter((s) => s.studentId === studentId);
  }
  if (teacherId) {
    sessions = sessions.filter((s) => s.teacherId === teacherId);
  }
  if (sharedOnly === "true") {
    sessions = sessions.filter((s) => s.sharedWithStudent);
  }

  sessions.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const now = new Date().toISOString();
  const isGroup = body.type === "group_review";

  const { adminDb } = await import("@/lib/firebase/admin");

  // Group review session
  if (isGroup) {
    const sessionData = {
      teacherId: body.teacherId,
      teacherName: body.teacherName,
      createdByAdminId: authResult.uid,
      type: "group_review" as const,
      status: "scheduled" as const,
      scheduledAt: body.scheduledAt,
      duration: body.duration ?? null,
      meetLink: body.meetLink ?? null,
      notes: body.notes ?? null,
      theme: body.theme ?? null,
      targetWeakness: body.targetWeakness ?? null,
      submissionDeadline: body.submissionDeadline,
      maxParticipants: body.maxParticipants ?? 20,
      participantIds: body.participantIds ?? [],
      votingEnabled: true,
      sharedWithStudent: true,
      studentId: "",
      studentName: "",
      createdAt: now,
      updatedAt: now,
    };

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const ref = await adminDb.collection("sessions").add(sessionData);

    // 参加生徒全員に Push 通知 (登録済みトークンがあれば)
    if (Array.isArray(sessionData.participantIds)) {
      await Promise.all(
        sessionData.participantIds.map((sid: string) =>
          notifyStudentOfSession(sid, {
            id: ref.id,
            scheduledAt: sessionData.scheduledAt,
            teacherName: sessionData.teacherName,
            type: sessionData.type,
          }),
        ),
      );
    }

    return NextResponse.json({ ...sessionData, id: ref.id });
  }

  // 1:1 session (existing logic)
  const session: Session = {
    id: `session-${Date.now()}`,
    ...body,
    createdByAdminId: authResult.uid,
    status: "scheduled",
    sharedWithStudent: false,
    createdAt: now,
    updatedAt: now,
  };

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const studentDoc = await adminDb.doc(`users/${body.studentId}`).get();
    const studentData = studentDoc.data();
    if (
      authResult.role !== "superadmin" &&
      studentData?.managedBy !== authResult.uid
    ) {
      return NextResponse.json(
        { error: "この生徒のセッションを作成する権限がありません" },
        { status: 403 }
      );
    }
    if ((studentData?.plan ?? "self") !== "coach") {
      return NextResponse.json(
        { error: "コーチプランの生徒のみセッションを作成できます" },
        { status: 403 }
      );
    }

    const ref = await adminDb.collection("sessions").add({
      teacherId: session.teacherId,
      studentId: session.studentId,
      teacherName: session.teacherName,
      studentName: session.studentName,
      createdByAdminId: session.createdByAdminId,
      type: session.type,
      status: session.status,
      scheduledAt: session.scheduledAt,
      duration: session.duration ?? null,
      meetLink: session.meetLink ?? null,
      notes: session.notes ?? null,
      sharedWithStudent: session.sharedWithStudent,
      createdAt: now,
      updatedAt: now,
    });
    session.id = ref.id;

    // 1:1 セッション作成: 担当生徒に Push 通知
    await notifyStudentOfSession(session.studentId, {
      id: session.id,
      scheduledAt: session.scheduledAt,
      teacherName: session.teacherName,
      type: session.type,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "セッションの作成に失敗しました" }, { status: 500 });
  }

  return NextResponse.json(session, { status: 201 });
}
