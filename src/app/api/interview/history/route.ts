import { NextRequest, NextResponse } from "next/server";

const MOCK_HISTORY = [
  {
    id: "mock-interview-1",
    userId: "mock-user",
    universityId: "tokyo",
    facultyId: "engineering",
    mode: "individual",
    status: "completed",
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 15,
    scores: { clarity: 7, apAlignment: 6, enthusiasm: 8, specificity: 6, bodyLanguage: 0, total: 27 },
    universityContext: {
      universityName: "東京大学",
      facultyName: "工学部",
      admissionPolicy: "（AP未設定）",
    },
  },
  {
    id: "mock-interview-2",
    userId: "mock-user",
    universityId: "kyoto",
    facultyId: "law",
    mode: "individual",
    status: "completed",
    startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 18,
    scores: { clarity: 6, apAlignment: 7, enthusiasm: 7, specificity: 5, bodyLanguage: 0, total: 25 },
    universityContext: {
      universityName: "京都大学",
      facultyName: "法学部",
      admissionPolicy: "（AP未設定）",
    },
  },
  {
    id: "mock-interview-3",
    userId: "mock-user",
    universityId: "waseda",
    facultyId: "political_science",
    mode: "individual",
    status: "completed",
    startedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 12,
    scores: { clarity: 5, apAlignment: 5, enthusiasm: 6, specificity: 5, bodyLanguage: 0, total: 21 },
    universityContext: {
      universityName: "早稲田大学",
      facultyName: "政治経済学部",
      admissionPolicy: "（AP未設定）",
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { collection, query, where, orderBy, limit, getDocs } = await import(
          "firebase/firestore"
        );
        const interviewQuery = query(
          collection(db, "interviews"),
          where("userId", "==", userId),
          orderBy("startedAt", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(interviewQuery);
        const interviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        return NextResponse.json({ interviews });
      } catch (err) {
        console.warn("Failed to fetch interview history from Firestore:", err);
      }
    }

    return NextResponse.json({ interviews: MOCK_HISTORY });
  } catch (error) {
    console.error("Interview history error:", error);
    return NextResponse.json(
      { error: "面接履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
