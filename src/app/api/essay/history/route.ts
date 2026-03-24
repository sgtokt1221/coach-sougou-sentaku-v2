import { NextRequest, NextResponse } from "next/server";
import type { Essay } from "@/lib/types/essay";

const MOCK_HISTORY: Essay[] = [
  {
    id: "mock_essay_002",
    userId: "mock_user_001",
    imageUrl: "gs://placeholder/mock_essay_002.jpg",
    ocrText: "モック小論文2のテキストです。",
    targetUniversity: "kyoto",
    targetFaculty: "faculty_of_economics",
    topic: "少子化問題の解決策",
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: "reviewed",
    scores: {
      structure: 6,
      logic: 6,
      expression: 7,
      apAlignment: 6,
      originality: 5,
      total: 30,
    },
    feedback: {
      overall: "改善の余地があります。",
      goodPoints: ["テーマ設定が的確"],
      improvements: ["論拠の強化が必要"],
      repeatedIssues: [],
      improvementsSinceLast: [],
    },
  },
  {
    id: "mock_essay_001",
    userId: "mock_user_001",
    imageUrl: "gs://placeholder/mock_essay_001.jpg",
    ocrText: "モック小論文1のテキストです。",
    targetUniversity: "tokyo",
    targetFaculty: "faculty_of_law",
    topic: "民主主義の課題",
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    status: "reviewed",
    scores: {
      structure: 7,
      logic: 7,
      expression: 8,
      apAlignment: 7,
      originality: 6,
      total: 35,
    },
    feedback: {
      overall: "バランスの取れた小論文です。",
      goodPoints: ["構成が明確"],
      improvements: ["独自性を高めましょう"],
      repeatedIssues: [],
      improvementsSinceLast: [],
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId パラメータは必須です" },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json(MOCK_HISTORY);
    }

    const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
    const essaysQuery = query(
      collection(db, "essays"),
      where("userId", "==", userId),
      orderBy("submittedAt", "desc")
    );

    const snapshot = await getDocs(essaysQuery);
    const essays: Essay[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        ocrText: data.ocrText,
        targetUniversity: data.targetUniversity,
        targetFaculty: data.targetFaculty,
        topic: data.topic,
        submittedAt: data.submittedAt?.toDate() ?? new Date(),
        scores: data.scores,
        feedback: data.feedback,
        status: data.status,
      };
    });

    return NextResponse.json(essays);
  } catch (error) {
    console.error("Essay history error:", error);
    return NextResponse.json(
      { error: "履歴取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
