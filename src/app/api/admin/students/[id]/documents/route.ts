import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Document, DocumentStatus } from "@/lib/types/document";

interface DocumentListItem {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  deadline?: string;
  updatedAt: string;
  aiScore?: {
    apAlignment: number;
    structure: number;
    originality: number;
  };
}

const MOCK_DOCUMENTS: DocumentListItem[] = [
  {
    id: "doc_001",
    type: "志望理由書",
    universityName: "東京大学",
    facultyName: "法学部",
    wordCount: 650,
    targetWordCount: 800,
    status: "reviewed",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    aiScore: { apAlignment: 7, structure: 8, originality: 6 },
  },
  {
    id: "doc_002",
    type: "学業活動報告書",
    universityName: "東京大学",
    facultyName: "法学部",
    wordCount: 350,
    targetWordCount: 1000,
    status: "draft",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "doc_003",
    type: "志望理由書",
    universityName: "京都大学",
    facultyName: "経済学部",
    wordCount: 800,
    targetWordCount: 800,
    status: "final",
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    aiScore: { apAlignment: 8, structure: 9, originality: 7 },
  },
  {
    id: "doc_004",
    type: "自己推薦書",
    universityName: "京都大学",
    facultyName: "経済学部",
    wordCount: 200,
    targetWordCount: 600,
    status: "draft",
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json(MOCK_DOCUMENTS);
  }

  try {
    // managedByスコーピング
    if (role !== "superadmin") {
      const studentDoc = await adminDb.doc(`users/${studentId}`).get();
      if (!studentDoc.exists || studentDoc.data()?.managedBy !== callerUid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }

    const snapshot = await adminDb
      .collection(`users/${studentId}/documents`)
      .orderBy("updatedAt", "desc")
      .get();

    const documents: DocumentListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const latestVersion = data.versions?.length > 0
        ? data.versions[data.versions.length - 1]
        : null;
      const feedback = latestVersion?.feedback;

      return {
        id: doc.id,
        type: data.type ?? "",
        universityName: data.universityName ?? "",
        facultyName: data.facultyName ?? "",
        wordCount: data.wordCount ?? 0,
        targetWordCount: data.targetWordCount ?? undefined,
        status: data.status ?? "draft",
        deadline: data.deadline ?? undefined,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        aiScore: feedback
          ? {
              apAlignment: feedback.apAlignmentScore,
              structure: feedback.structureScore,
              originality: feedback.originalityScore,
            }
          : undefined,
      };
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Admin student documents error:", error);
    return NextResponse.json(MOCK_DOCUMENTS);
  }
}
