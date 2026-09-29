import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { resolveDraftTopicLabel } from "@/lib/essay/draft-topic-label";
import type { EssayDraft } from "@/lib/types/essay";

function toIso(v: unknown): string {
  const d = (v as { toDate?: () => Date } | undefined)?.toDate?.();
  if (d) return d.toISOString();
  return typeof v === "string" ? v : "";
}

/**
 * GET /api/admin/students/[id]/essay-drafts
 * 生徒が書きかけている小論文の下書き（提出前）を新しい順に返す。
 * 提出すると下書きは消えるので、ここに出るのは未提出のものだけ。
 */
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

    const snap = await adminDb
      .collection(`users/${studentId}/essayDrafts`)
      .orderBy("updatedAt", "desc")
      .get();

    const drafts: EssayDraft[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        directText: data.directText ?? "",
        topic: data.topic ?? "",
        universityId: data.universityId ?? "",
        facultyId: data.facultyId ?? "",
        selectedCompoundId: data.selectedCompoundId ?? "",
        customMaxLength: data.customMaxLength,
        universityName: data.universityName ?? "",
        facultyName: data.facultyName ?? "",
        themeId: data.themeId,
        pastQuestionId: data.pastQuestionId,
        homeworkId: data.homeworkId,
        reportMaterialId: data.reportMaterialId,
        oralExam: data.oralExam,
        oralExamAnswers: data.oralExamAnswers,
        topicLabel: resolveDraftTopicLabel(data),
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Admin essay drafts GET error:", error);
    return NextResponse.json(
      { error: "下書きの取得に失敗しました" },
      { status: 500 }
    );
  }
}
