import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type {
  DocumentStatus,
  DocumentReview,
  DocumentAiLikeness,
} from "@/lib/types/document";

interface DocumentListItem {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  review?: DocumentReview;
  deadline?: string;
  updatedAt: string;
  aiScore?: {
    apAlignment?: number;
    structure: number;
    originality: number;
  };
  aiLikeness?: DocumentAiLikeness;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 組織スコーピング（自塾の admin は代行可、担当講師も許可）
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }
    const denied = await scopeByOrganization({
      requesterUid: callerUid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: studentDoc.data()?.managedBy,
        organizationId: studentDoc.data()?.organizationId,
        assignedTeacherIds: getAssignedTeacherIds(studentDoc.data()),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;

    // 書類の実データはグローバル `documents` に存在する（userId で絞る。
    // 生徒側 /api/documents と同一クエリ＝複合インデックスは既存）。
    const snapshot = await adminDb
      .collection("documents")
      .where("userId", "==", studentId)
      .orderBy("updatedAt", "desc")
      .get();

    const documents: DocumentListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const latestVersion =
        data.versions?.length > 0
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
        review: (data.review as DocumentReview) ?? undefined,
        deadline: data.deadline ?? undefined,
        updatedAt:
          typeof data.updatedAt === "string"
            ? data.updatedAt
            : (data.updatedAt?.toDate?.()?.toISOString() ??
              new Date().toISOString()),
        aiScore: feedback
          ? {
              apAlignment:
                typeof feedback.apAlignmentScore === "number"
                  ? feedback.apAlignmentScore
                  : undefined,
              structure: feedback.structureScore,
              originality: feedback.originalityScore,
            }
          : undefined,
        aiLikeness: (data.aiLikeness as DocumentAiLikeness) ?? undefined,
      };
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Admin student documents error:", error);
    return NextResponse.json(
      { error: "データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
