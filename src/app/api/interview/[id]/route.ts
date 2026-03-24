import { NextRequest, NextResponse } from "next/server";

const MOCK_INTERVIEW = {
  id: "mock-id",
  userId: "mock-user",
  universityId: "tokyo",
  facultyId: "engineering",
  mode: "individual",
  status: "completed",
  startedAt: new Date().toISOString(),
  duration: 15,
  scores: { clarity: 7, apAlignment: 6, enthusiasm: 8, specificity: 6, total: 27 },
  feedback: {
    overall: "全体的に誠実な印象で、志望理由が明確に伝えられていました。",
    goodPoints: ["志望理由が明確で一貫性がある"],
    improvements: ["具体的なエピソードや数値データをもっと活用しましょう"],
    repeatedIssues: [],
    improvementsSinceLast: [],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const interviewDoc = await getDoc(doc(db, "interviews", id));
        if (interviewDoc.exists()) {
          return NextResponse.json({ id: interviewDoc.id, ...interviewDoc.data() });
        }
      } catch (err) {
        console.warn("Failed to fetch interview from Firestore:", err);
      }
    }

    return NextResponse.json({ ...MOCK_INTERVIEW, id });
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json(
      { error: "面接データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
