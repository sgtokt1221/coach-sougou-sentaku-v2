import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  InterviewMessage,
  InterviewScores,
  InterviewFeedback,
  InterviewMode,
  VoiceAnalysis,
} from "@/lib/types/interview";

export interface InterviewDetail {
  id: string;
  mode: InterviewMode;
  targetUniversity: string;
  targetFaculty: string;
  messages: InterviewMessage[];
  scores: InterviewScores | null;
  feedback: InterviewFeedback | null;
  voiceAnalysis: VoiceAnalysis | null;
  createdAt: string;
  duration: number;
}

const mockDetail: InterviewDetail = {
  id: "interview_001",
  mode: "individual",
  targetUniversity: "東京大学",
  targetFaculty: "法学部",
  messages: [
    { role: "ai", content: "こんにちは。本日は東京大学法学部の模擬面接を行います。まず、志望理由をお聞かせください。" },
    { role: "student", content: "はい。私は法学部を志望しています。特に憲法学に関心があり、基本的人権の保障について深く学びたいと考えています。" },
    { role: "ai", content: "なるほど。憲法学への関心とのことですが、具体的にどのようなきっかけで人権問題に関心を持ったのですか？" },
    { role: "student", content: "高校2年生の時に参加した模擬国連で、難民の権利について議論したことがきっかけです。国際法と国内法の間で、人権がどのように保障されるべきかに強い関心を持ちました。" },
    { role: "ai", content: "模擬国連での経験は素晴らしいですね。東京大学法学部で学ぶことで、将来どのようなキャリアを考えていますか？" },
    { role: "student", content: "将来は国際機関や外務省で、人権問題に関わる政策立案に携わりたいと考えています。東京大学の国際法研究室は国内トップレベルであり、その環境で学ぶことが目標達成の最短ルートだと確信しています。" },
  ],
  scores: { clarity: 8, apAlignment: 7, enthusiasm: 9, specificity: 7, total: 31 },
  feedback: {
    overall: "志望理由が明確で、熱意が伝わる回答でした。具体例をもう少し増やすとより説得力が増します。",
    goodPoints: [
      "志望理由が論理的で一貫している",
      "模擬国連の具体的な経験を効果的に引用",
      "将来のキャリアビジョンが明確",
    ],
    improvements: [
      "学部の具体的なカリキュラムや教授への言及があるとより良い",
      "「最短ルート」という表現は謙虚さに欠ける印象を与える可能性",
      "他大学との比較ではなく、東大固有の魅力をもっと掘り下げる",
    ],
    repeatedIssues: [],
    improvementsSinceLast: [],
  },
  voiceAnalysis: null,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  duration: 1200,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id, interviewId } = await params;

  if (!adminDb) {
    return NextResponse.json({ ...mockDetail, id: interviewId });
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

    const interviewDoc = await adminDb
      .doc(`users/${id}/interviews/${interviewId}`)
      .get();

    if (!interviewDoc.exists) {
      return NextResponse.json({ error: "面接データが見つかりません" }, { status: 404 });
    }

    const data = interviewDoc.data()!;

    const detail: InterviewDetail = {
      id: interviewDoc.id,
      mode: data.mode ?? "individual",
      targetUniversity: data.targetUniversity ?? "",
      targetFaculty: data.targetFaculty ?? "",
      messages: data.messages ?? [],
      scores: data.scores ?? null,
      feedback: data.feedback ?? null,
      voiceAnalysis: data.voiceAnalysis ?? null,
      createdAt: data.startedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      duration: data.duration ?? 0,
    };

    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ ...mockDetail, id: interviewId });
  }
}
