import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";

/**
 * GET /api/admin/reports/[studentId]/[reportId]
 *
 * 成長レポートを単体取得する。詳細画面 (新ルート) で利用。
 *
 * 認可: admin / teacher / superadmin + managedBy スコープ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { studentId, reportId } = await params;

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません", detail: "adminDb is not initialized" },
        { status: 500 }
      );
    }

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

    const reportSnap = await adminDb
      .doc(`users/${studentId}/growthReports/${reportId}`)
      .get();
    if (!reportSnap.exists) {
      return NextResponse.json({ error: "レポートが見つかりません" }, { status: 404 });
    }

    const data = reportSnap.data()!;
    const report: GrowthReport = {
      id: reportSnap.id,
      studentId: data.studentId ?? studentId,
      studentName: data.studentName ?? "",
      period: data.period ?? "weekly",
      startDate: data.startDate?.toDate?.()?.toISOString() ?? "",
      endDate: data.endDate?.toDate?.()?.toISOString() ?? "",
      generatedAt: data.generatedAt?.toDate?.()?.toISOString() ?? "",
      essayStats: data.essayStats ?? {
        count: 0,
        avgScore: 0,
        scoreChange: 0,
        bestCategory: "-",
        worstCategory: "-",
      },
      interviewStats: data.interviewStats ?? { count: 0, avgScore: 0, scoreChange: 0 },
      weaknessProgress: data.weaknessProgress ?? [],
      recommendations: data.recommendations ?? [],
      overallAssessment: data.overallAssessment ?? "",
      sessionSummary: data.sessionSummary,
      practiceQuestions: data.practiceQuestions,
      teacherComment: data.teacherComment,
      editedBy: data.editedBy,
      editedAt: data.editedAt,
      sharedWithStudent: data.sharedWithStudent,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("[reports/[studentId]/[reportId]] GET error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "レポートの取得に失敗しました", detail },
      { status: 500 }
    );
  }
}

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
          // 既存フィールド
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
          // Phase 2 拡張フィールド
          if (q.usage === "lesson" || q.usage === "homework" || q.usage === "extra") {
            cleaned.usage = q.usage;
          }
          if (
            q.difficulty === "basic" ||
            q.difficulty === "standard" ||
            q.difficulty === "advanced"
          ) {
            cleaned.difficulty = q.difficulty;
          }
          if (typeof q.estimatedMinutes === "number" && q.estimatedMinutes > 0) {
            cleaned.estimatedMinutes = Math.round(q.estimatedMinutes);
          }
          if (typeof q.objective === "string" && q.objective.length > 0) {
            cleaned.objective = q.objective;
          }
          if (Array.isArray(q.rubric)) {
            const rubric = q.rubric.filter(
              (r): r is string => typeof r === "string" && r.length > 0,
            );
            if (rubric.length > 0) cleaned.rubric = rubric;
          }
          if (Array.isArray(q.hints)) {
            const hints = q.hints.filter(
              (h): h is string => typeof h === "string" && h.length > 0,
            );
            if (hints.length > 0) cleaned.hints = hints;
          }
          if (typeof q.teacherNotes === "string" && q.teacherNotes.length > 0) {
            cleaned.teacherNotes = q.teacherNotes;
          }
          if (
            q.answerVisibility === "teacher_only" ||
            q.answerVisibility === "after_submission" ||
            q.answerVisibility === "student_visible"
          ) {
            cleaned.answerVisibility = q.answerVisibility;
          }
          if (typeof q.order === "number") {
            cleaned.order = q.order;
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
