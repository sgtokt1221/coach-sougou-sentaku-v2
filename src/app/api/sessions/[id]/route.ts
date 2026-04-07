import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";

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
    id: "session-group-1",
    teacherId: "teacher-1",
    studentId: "student-1",
    teacherName: "山田先生",
    studentName: "田中太郎",
    type: "group_review",
    status: "in_progress",
    scheduledAt: "2026-04-08T15:00:00",
    duration: 90,
    meetLink: "https://meet.google.com/group-session-abc",
    notes: "グループ添削セッション",
    theme: "現代社会の課題と解決策",
    targetWeakness: "論理構成",
    submissionDeadline: "2026-04-07T23:59:59",
    votingEnabled: true,
    participantIds: ["student-1", "student-2", "student-3"],
    sharedWithStudent: true,
    createdAt: "2026-04-05T10:00:00",
    updatedAt: "2026-04-06T14:00:00",
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

function findMockSession(id: string): Session | undefined {
  return MOCK_SESSIONS.find((s) => s.id === id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let session: Session | null = findMockSession(id) ?? null;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "sessions", id));
      if (snap.exists()) {
        session = { id: snap.id, ...snap.data() } as Session;
      }
    } catch {
      // fall through to mock data
    }
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();

  let session: Session | null = findMockSession(id) ?? null;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, getDoc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "sessions", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const prevData = snap.data() as Session;
        const updatePayload: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };

        // セッション完了時にサマリーを自動生成
        if (updates.status === "completed" && prevData.status !== "completed") {
          try {
            const summary = await generateSessionSummary({
              notes: prevData.notes,
              type: prevData.type,
            });
            updatePayload.summary = summary;
            updatePayload.sharedWithStudent = true;
          } catch (err) {
            console.warn("Auto summary generation failed:", err);
          }
        }

        await updateDoc(ref, updatePayload);
        const updated = await getDoc(ref);
        return NextResponse.json({ id: updated.id, ...updated.data() });
      }
    } catch {
      // fall through to mock
    }
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let summaryUpdate: Partial<Session> = {};

  // セッション完了時にサマリーを自動生成（モックパス）
  if (updates.status === "completed" && session.status !== "completed") {
    try {
      const summary = await generateSessionSummary({
        notes: session.notes,
        type: session.type,
      });
      summaryUpdate = { summary, sharedWithStudent: true };
    } catch (err) {
      console.warn("Auto summary generation failed:", err);
    }
  }

  const updated: Session = {
    ...session,
    ...updates,
    ...summaryUpdate,
    id,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "sessions", id));
    } catch {
      // fall through
    }
  }

  return NextResponse.json({ success: true, id });
}
