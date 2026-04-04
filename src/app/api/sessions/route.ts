import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { Session, SessionCreateRequest } from "@/lib/types/session";

const MOCK_SESSIONS: Session[] = [
  {
    id: "session-1",
    teacherId: "teacher_001",
    studentId: "student-1",
    teacherName: "講師 花子",
    studentName: "田中太郎",
    createdByAdminId: "dev-user",
    type: "coaching",
    status: "completed",
    scheduledAt: "2026-03-18T14:00:00",
    duration: 45,
    meetLink: "https://meet.google.com/abc-defg-hij",
    notes: "志望理由書の方向性について相談",
    summary: {
      overview:
        "志望理由書の構成について議論し、具体的なエピソードの洗い出しを行った。",
      topicsDiscussed: [
        "志望理由書の構成",
        "活動実績の整理",
        "今後の準備スケジュール",
      ],
      strengths: ["志望動機が明確", "活動実績が豊富"],
      improvements: [
        "エピソードの具体性を高める",
        "APとの関連付けを強化",
      ],
      actionItems: [
        {
          task: "志望理由書の第1稿を作成",
          assignee: "student",
          deadline: "2026-03-25",
          completed: false,
        },
        {
          task: "活動実績リストのレビュー",
          assignee: "teacher",
          completed: false,
        },
      ],
      generatedAt: "2026-03-18T15:00:00",
    },
    sharedWithStudent: true,
    createdAt: "2026-03-15T10:00:00",
    updatedAt: "2026-03-18T15:00:00",
  },
  {
    id: "session-2",
    teacherId: "teacher_001",
    studentId: "student-2",
    teacherName: "講師 花子",
    studentName: "佐藤花子",
    createdByAdminId: "dev-user",
    type: "mock_interview",
    status: "scheduled",
    scheduledAt: "2026-03-22T10:00:00",
    duration: 60,
    meetLink: "https://meet.google.com/klm-nopq-rst",
    notes: "京都大学文学部の個人面接対策",
    sharedWithStudent: true,
    createdAt: "2026-03-19T09:00:00",
    updatedAt: "2026-03-19T09:00:00",
  },
  {
    id: "session-3",
    teacherId: "teacher_002",
    studentId: "student-1",
    teacherName: "講師 太郎",
    studentName: "田中太郎",
    createdByAdminId: "dev-user",
    type: "essay_review",
    status: "in_progress",
    scheduledAt: "2026-03-21T15:00:00",
    duration: 30,
    notes: "小論文の第2稿レビュー",
    sharedWithStudent: false,
    createdAt: "2026-03-20T11:00:00",
    updatedAt: "2026-03-21T15:05:00",
  },
];

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
  if (adminDb) {
    try {
      const snap = await adminDb.collection("sessions").get();
      if (!snap.empty) {
        sessions = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Session
        );
      }
    } catch {
      // fall through to mock data
    }
  }

  if (sessions.length === 0) {
    sessions = MOCK_SESSIONS;
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

  const body: SessionCreateRequest = await request.json();

  const now = new Date().toISOString();
  const session: Session = {
    id: `session-${Date.now()}`,
    ...body,
    createdByAdminId: authResult.uid,
    status: "scheduled",
    sharedWithStudent: false,
    createdAt: now,
    updatedAt: now,
  };

  const { adminDb } = await import("@/lib/firebase/admin");
  if (adminDb) {
    try {
      // 生徒のmanagedBy + planチェック
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
      // コーチプランでない生徒にはセッション作成不可（undefinedはselfとして扱う）
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
    } catch {
      // return mock response
    }
  }

  return NextResponse.json(session, { status: 201 });
}
