import { NextRequest, NextResponse } from "next/server";
import type { Essay } from "@/lib/types/essay";

const MOCK_ESSAY: Essay = {
  id: "mock_essay_001",
  userId: "mock_user_001",
  imageUrl: "gs://placeholder/mock_essay_001.jpg",
  ocrText: "これはモックの小論文テキストです。",
  targetUniversity: "tokyo",
  targetFaculty: "faculty_of_law",
  topic: "現代社会における民主主義の課題",
  submittedAt: new Date(),
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
    overall: "モックフィードバックです。",
    goodPoints: ["論理構成が明確です"],
    improvements: ["根拠をより具体的に"],
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
    if (!db) {
      return NextResponse.json({ ...MOCK_ESSAY, id });
    }

    const { doc, getDoc } = await import("firebase/firestore");
    const essayDoc = await getDoc(doc(db, "essays", id));

    if (!essayDoc.exists()) {
      return NextResponse.json({ error: "小論文が見つかりません" }, { status: 404 });
    }

    const data = essayDoc.data();
    const essay: Essay = {
      id: essayDoc.id,
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

    return NextResponse.json(essay);
  } catch (error) {
    console.error("Essay get error:", error);
    return NextResponse.json(
      { error: "取得処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
