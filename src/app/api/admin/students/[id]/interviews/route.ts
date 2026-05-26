import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { InterviewScores, InterviewMode } from "@/lib/types/interview";

function resolveUniName(uniId: string, facId: string): { uniName: string; facName: string } {
  let uni = MOCK_UNIVERSITIES.find((u) => u.id === uniId);
  if (!uni && uniId) uni = MOCK_UNIVERSITIES.find((u) => uniId.startsWith(u.id) || u.id.startsWith(uniId));
  let fac = uni?.faculties?.find((f) => f.id === facId);
  if (!fac && facId && uni?.faculties) fac = uni.faculties.find((f) => facId.startsWith(f.id) || f.id.startsWith(facId));
  return { uniName: uni?.name ?? uniId, facName: fac?.name ?? facId };
}

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

  let step = "start";

  try {
    step = "resolve_params";
    const { id } = await params;

    step = "init_check";
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[admin/interviews] adminDb missing — returning mock for local dev",
        );
        return NextResponse.json(mockInterviews);
      }
      return NextResponse.json(
        {
          error: "Firestore に接続できません",
          detail: "adminDb is not initialized",
          step,
        },
        { status: 500 }
      );
    }

    step = "fetch_student";
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;

    step = "check_permission";
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    // 採点まで完了した面接のみ表示 (中断データは除外)
    step = "query_interviews";
    let snapshot;
    try {
      // composite index がある場合の高速経路
      snapshot = await adminDb
        .collection("interviews")
        .where("userId", "==", id)
        .where("status", "==", "completed")
        .orderBy("startedAt", "desc")
        .get();
    } catch (indexErr) {
      // インデックス未作成時のフォールバック: orderBy なしで取得 → JS ソート
      console.warn("[admin/interviews] index missing, fallback to JS sort:", indexErr);
      snapshot = await adminDb
        .collection("interviews")
        .where("userId", "==", id)
        .where("status", "==", "completed")
        .get();
    }

    step = "map_results";
    const interviews: InterviewListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const resolved = resolveUniName(data.targetUniversity ?? "", data.targetFaculty ?? "");
      return {
        id: doc.id,
        mode: data.mode ?? "individual",
        targetUniversity: resolved.uniName,
        targetFaculty: resolved.facName,
        scores: data.scores ?? null,
        feedbackSummary: data.feedback?.overall ?? null,
        // startedAt 欠損ドキュメントは Epoch (1970) として末尾に沈める。
        // 現在時刻 fallback だと欠損データが常に「最新」を装ってしまうため。
        createdAt: data.startedAt?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
        duration: data.duration ?? 0,
      };
    });

    // 高速経路は既に降順だが、フォールバック経路も含めて常に JS ソート (降順)
    interviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json(interviews);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[admin/interviews] step=${step} error:`, error);
    return NextResponse.json(
      {
        error: "面接履歴の取得に失敗しました",
        detail,
        step,
        stack: process.env.NODE_ENV === "production" ? undefined : stack,
      },
      { status: 500 }
    );
  }
}
