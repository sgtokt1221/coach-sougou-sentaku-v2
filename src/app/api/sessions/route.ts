import { NextRequest, NextResponse } from "next/server";
import type { Session, SessionCreateRequest } from "@/lib/types/session";

const MOCK_SESSIONS: Session[] = [
  {
    id: "session-1",
    teacherId: "teacher-1",
    studentId: "student-1",
    teacherName: "山田先生",
    studentName: "田中太郎",
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
    teacherId: "teacher-1",
    studentId: "student-2",
    teacherName: "山田先生",
    studentName: "佐藤花子",
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
    teacherId: "teacher-2",
    studentId: "student-1",
    teacherName: "鈴木先生",
    studentName: "田中太郎",
    type: "essay_review",
    status: "in_progress",
    scheduledAt: "2026-03-21T15:00:00",
    duration: 30,
    notes: "小論文の第2稿レビュー",
    sharedWithStudent: false,
    createdAt: "2026-03-20T11:00:00",
    updatedAt: "2026-03-21T15:05:00",
  },
  {
    id: "session-4",
    teacherId: "teacher-2",
    studentId: "student-3",
    teacherName: "鈴木先生",
    studentName: "高橋健一",
    type: "general",
    status: "cancelled",
    scheduledAt: "2026-03-17T16:00:00",
    notes: "体調不良のためキャンセル",
    sharedWithStudent: false,
    createdAt: "2026-03-14T08:00:00",
    updatedAt: "2026-03-16T20:00:00",
  },
  {
    id: "session-5",
    teacherId: "teacher-1",
    studentId: "student-3",
    teacherName: "山田先生",
    studentName: "高橋健一",
    type: "coaching",
    status: "scheduled",
    scheduledAt: "2026-03-24T13:00:00",
    duration: 45,
    meetLink: "https://meet.google.com/uvw-xyza-bcd",
    notes: "出願戦略の最終確認",
    sharedWithStudent: true,
    createdAt: "2026-03-20T14:00:00",
    updatedAt: "2026-03-20T14:00:00",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const studentId = searchParams.get("studentId");
  const teacherId = searchParams.get("teacherId");
  const sharedOnly = searchParams.get("sharedWithStudent");

  let sessions: Session[] = [];

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "sessions"));
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
  const body: SessionCreateRequest = await request.json();

  const now = new Date().toISOString();
  const session: Session = {
    id: `session-${Date.now()}`,
    ...body,
    status: "scheduled",
    sharedWithStudent: false,
    createdAt: now,
    updatedAt: now,
  };

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      const ref = await addDoc(collection(db, "sessions"), {
        ...session,
        id: undefined,
      });
      session.id = ref.id;
    } catch {
      // return mock response
    }
  }

  return NextResponse.json(session, { status: 201 });
}
