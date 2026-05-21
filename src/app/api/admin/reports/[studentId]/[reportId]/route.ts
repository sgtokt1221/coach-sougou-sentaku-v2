import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { PracticeQuestion } from "@/lib/types/growth-report";

/**
 * PATCH /api/admin/reports/[studentId]/[reportId]
 *
 * 講師・管理者が成長レポートのテキスト系項目を編集する API。
 * 統計系 (essayStats / interviewStats / weaknessProgress) は AI/集計が
 * 真実のため編集不可。テキスト系 3 つ + 公開フラグだけを編集対象とする。
 *
 * 編集可能項目:
 * - overallAssessment (AI 生成の総合評価を講師が手直し)
 * - recommendations (推奨アクション配列を手直し)
 * - teacherComment (講師独自のコメント、新規追加レイヤー)
 * - sharedWithStudent (生徒に公開するかのフラグ)
 *
 * 認可: admin / teacher / superadmin + managedBy スコープ (生徒の担当者のみ編集可)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  let step = "start";

  try {
    step = "resolve_params";
    const { studentId, reportId } = await params;

    step = "init_check";
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません", detail: "adminDb is not initialized", step },
        { status: 500 }
      );
    }

    step = "check_student_permission";
    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    if (role !== "superadmin" && userData.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    step = "parse_body";
    const body = (await request.json()) as {
      overallAssessment?: string;
      recommendations?: string[];
      teacherComment?: string;
      sharedWithStudent?: boolean;
      practiceQuestions?: PracticeQuestion[];
    };

    // 編集対象の白リスト方式で update を組み立てる
    const update: Record<string, unknown> = {
      editedBy: uid,
      editedAt: new Date().toISOString(),
    };
    if (typeof body.overallAssessment === "string") {
      update.overallAssessment = body.overallAssessment;
    }
    if (Array.isArray(body.recommendations)) {
      update.recommendations = body.recommendations.filter(
        (r) => typeof r === "string"
      );
    }
    if (typeof body.teacherComment === "string") {
      update.teacherComment = body.teacherComment;
    }
    if (typeof body.sharedWithStudent === "boolean") {
      update.sharedWithStudent = body.sharedWithStudent;
    }
    if (Array.isArray(body.practiceQuestions)) {
      // 各類題から undefined フィールドを除外して Firestore エラーを防ぐ
      update.practiceQuestions = body.practiceQuestions
        .filter(
          (q): q is PracticeQuestion =>
            !!q &&
            typeof q.id === "string" &&
            (q.type === "essay" || q.type === "interview") &&
            typeof q.title === "string" &&
            q.title.trim().length > 0,
        )
        .map((q) => {
          const cleaned: PracticeQuestion = {
            id: q.id,
            type: q.type,
            title: q.title,
          };
          if (q.priority === "primary" || q.priority === "secondary") {
            cleaned.priority = q.priority;
          }
          if (typeof q.relatedWeakness === "string" && q.relatedWeakness.length > 0) {
            cleaned.relatedWeakness = q.relatedWeakness;
          }
          if (typeof q.relatedPastTopic === "string" && q.relatedPastTopic.length > 0) {
            cleaned.relatedPastTopic = q.relatedPastTopic;
          }
          if (typeof q.modelAnswer === "string" && q.modelAnswer.length > 0) {
            cleaned.modelAnswer = q.modelAnswer;
          }
          return cleaned;
        });
    }

    step = "fetch_report";
    const reportRef = adminDb.doc(
      `users/${studentId}/growthReports/${reportId}`
    );
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return NextResponse.json(
        { error: "レポートが見つかりません" },
        { status: 404 }
      );
    }

    step = "update_report";
    await reportRef.update(update);

    step = "fetch_updated";
    const updatedSnap = await reportRef.get();
    return NextResponse.json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error(`[admin/reports PATCH] step=${step} error:`, error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "レポートの更新に失敗しました", detail, step },
      { status: 500 }
    );
  }
}
