import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { InterviewScores, InterviewMode } from "@/lib/types/interview";

export interface InterviewListItem {
  id: string;
  mode: InterviewMode;
  targetUniversity: string;
  targetFaculty: string;
  scores: InterviewScores | null;
  feedbackSummary: string | null;
  createdAt: string;
  duration: number;
}

const mockInterviews: InterviewListItem[] = [
  {
    id: "interview_001",
    mode: "individual",
    targetUniversity: "東京大学",
    targetFaculty: "法学部",
    scores: { clarity: 8, apAlignment: 7, enthusiasm: 9, specificity: 7, bodyLanguage: 0, total: 31 },
    feedbackSummary: "志望理由が明確で、熱意が伝わる回答でした。具体例をもう少し増やすとより説得力が増します。",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 1200,
  },
  {
    id: "interview_002",
    mode: "presentation",
    targetUniversity: "京都大学",
    targetFaculty: "経済学部",
    scores: { clarity: 7, apAlignment: 6, enthusiasm: 8, specificity: 6, bodyLanguage: 0, total: 27 },
    feedbackSummary: "プレゼンの構成は良好ですが、データの裏付けが不足しています。",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 900,
  },
  {
    id: "interview_003",
    mode: "oral_exam",
    targetUniversity: "東京大学",
    targetFaculty: "法学部",
    scores: { clarity: 6, apAlignment: 5, enthusiasm: 7, specificity: 5, bodyLanguage: 0, total: 23 },
    feedbackSummary: "基礎知識は十分ですが、応用的な質問への対応力を強化しましょう。",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 1500,
  },
  {
    id: "interview_004",
    mode: "group_discussion",
    targetUniversity: "東京大学",
    targetFaculty: "法学部",
    scores: { clarity: 7, apAlignment: 7, enthusiasm: 8, specificity: 7, bodyLanguage: 0, total: 29 },
    feedbackSummary: "他者の意見を踏まえた発言ができています。リーダーシップの発揮にも期待。",
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 1800,
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json(mockInterviews);
  }

  try {
    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
    }

    const snapshot = await adminDb
      .collection("interviews")
      .where("userId", "==", id)
      .orderBy("startedAt", "desc")
      .get();

    const interviews: InterviewListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        mode: data.mode ?? "individual",
        targetUniversity: data.targetUniversity ?? "",
        targetFaculty: data.targetFaculty ?? "",
        scores: data.scores ?? null,
        feedbackSummary: data.feedback?.overall ?? null,
        createdAt: data.startedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        duration: data.duration ?? 0,
      };
    });

    return NextResponse.json(interviews);
  } catch {
    return NextResponse.json(mockInterviews);
  }
}
