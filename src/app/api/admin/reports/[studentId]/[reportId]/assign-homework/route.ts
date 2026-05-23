import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  HomeworkAssignment,
  AssignHomeworkRequest,
  AssignHomeworkResponse,
} from "@/lib/types/homework";
import type { GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";

/**
 * POST /api/admin/reports/[studentId]/[reportId]/assign-homework
 *
 * 指定された practiceQuestion を宿題として配布する。
 * - 既に配布済みのものはスキップ (再配布したい場合は事前に DELETE で取消)
 * - 配布時に snapshot を確保 (元レポート編集の影響を受けないため)
 *
 * DELETE /api/admin/reports/[studentId]/[reportId]/assign-homework?practiceQuestionId=xxx
 *
 * 配布取消。`status === "assigned"` のみ削除可。
 * `submitted` 以降は提出本文が essays/interviews に既に書き込まれているので削除不可。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { studentId, reportId } = await params;

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 },
      );
    }

    // 認可チェック
    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    if (role !== "superadmin" && userData.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 },
      );
    }

    // リクエスト解析
    const body = (await request.json()) as AssignHomeworkRequest;
    const practiceQuestionIds = Array.isArray(body.practiceQuestionIds)
      ? body.practiceQuestionIds.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    if (practiceQuestionIds.length === 0) {
      return NextResponse.json(
        { error: "practiceQuestionIds は必須です" },
        { status: 400 },
      );
    }

    // レポート取得
    const reportRef = adminDb.doc(`users/${studentId}/growthReports/${reportId}`);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return NextResponse.json(
        { error: "レポートが見つかりません" },
        { status: 404 },
      );
    }
    const report = reportSnap.data() as Partial<GrowthReport>;
    const practiceQuestions: PracticeQuestion[] = Array.isArray(report.practiceQuestions)
      ? report.practiceQuestions
      : [];

    // 学生の志望校情報 (1校目を AP コンテキストに使う)
    const targetUniversities = Array.isArray(userData.targetUniversities)
      ? (userData.targetUniversities as string[])
      : [];
    const firstTarget = targetUniversities[0]?.split(":");
    const defaultUniversity = firstTarget?.[0];
    const defaultFaculty = firstTarget?.[1];

    // 既に配布済みの practiceQuestionId を取得
    const existing = await adminDb
      .collection(`users/${studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", reportId)
      .get();
    const alreadyAssigned = new Set(
      existing.docs.map((d) => (d.data() as HomeworkAssignment).practiceQuestionId),
    );

    const created: HomeworkAssignment[] = [];
    const skipped: string[] = [];

    for (const pqId of practiceQuestionIds) {
      if (alreadyAssigned.has(pqId)) {
        skipped.push(pqId);
        continue;
      }
      const pq = practiceQuestions.find((q) => q.id === pqId);
      if (!pq) {
        skipped.push(pqId);
        continue;
      }

      const assignmentId = `hw_${Date.now()}_${pqId}`;
      const snapshot: HomeworkAssignment["snapshot"] = {
        type: pq.type,
        title: pq.title,
      };
      if (pq.hints && pq.hints.length > 0) snapshot.hints = pq.hints;
      if (pq.objective) snapshot.objective = pq.objective;
      if (pq.relatedWeakness && pq.relatedWeakness !== "弱点情報なし") {
        snapshot.relatedWeakness = pq.relatedWeakness;
      }
      if (typeof pq.estimatedMinutes === "number" && pq.estimatedMinutes > 0) {
        snapshot.estimatedMinutes = pq.estimatedMinutes;
      }
      if (defaultUniversity) snapshot.targetUniversity = defaultUniversity;
      if (defaultFaculty) snapshot.targetFaculty = defaultFaculty;

      const assignment: HomeworkAssignment = {
        id: assignmentId,
        studentId,
        sourceReportId: reportId,
        practiceQuestionId: pqId,
        snapshot,
        status: "assigned",
        assignedAt: new Date().toISOString(),
        assignedBy: uid,
        ...(body.dueDate ? { dueDate: body.dueDate } : {}),
      };

      await adminDb
        .doc(`users/${studentId}/homeworkAssignments/${assignmentId}`)
        .set({
          ...assignment,
          assignedAt: FieldValue.serverTimestamp(),
        });

      created.push(assignment);
    }

    const response: AssignHomeworkResponse = { created, skipped };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[assign-homework] error:", error);
    return NextResponse.json(
      {
        error: "宿題配布中にエラーが発生しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { studentId, reportId } = await params;
    const practiceQuestionId = request.nextUrl.searchParams.get("practiceQuestionId");
    if (!practiceQuestionId) {
      return NextResponse.json(
        { error: "practiceQuestionId クエリは必須です" },
        { status: 400 },
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 },
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
        { status: 403 },
      );
    }

    const matches = await adminDb
      .collection(`users/${studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", reportId)
      .where("practiceQuestionId", "==", practiceQuestionId)
      .get();

    if (matches.empty) {
      return NextResponse.json({ deleted: 0 });
    }

    let deleted = 0;
    for (const doc of matches.docs) {
      const data = doc.data() as HomeworkAssignment;
      // assigned 以外は削除不可 (submitted 以降は essays/interviews に提出本文があるため)
      if (data.status !== "assigned") continue;
      await doc.ref.delete();
      deleted += 1;
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[assign-homework DELETE] error:", error);
    return NextResponse.json(
      {
        error: "配布取消中にエラーが発生しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/reports/[studentId]/[reportId]/assign-homework
 *
 * 配布済み宿題の一覧 (このレポートから配布されたもの)。
 * UI で「どの類題がもう配布済みか」を判定する用途。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { studentId, reportId } = await params;
    if (!adminDb) {
      return NextResponse.json([]);
    }

    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    if (role !== "superadmin" && userData.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 },
      );
    }

    const snap = await adminDb
      .collection(`users/${studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", reportId)
      .get();

    const items: HomeworkAssignment[] = snap.docs.map((d) => {
      const data = d.data() as Omit<HomeworkAssignment, "assignedAt"> & {
        assignedAt?: string | { toDate?: () => Date };
      };
      const ts = data.assignedAt;
      const assignedAt =
        typeof ts === "string"
          ? ts
          : ts && typeof ts === "object" && typeof ts.toDate === "function"
            ? ts.toDate().toISOString()
            : new Date().toISOString();
      return {
        ...data,
        id: d.id,
        assignedAt,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[assign-homework GET] error:", error);
    return NextResponse.json(
      { error: "配布状況の取得に失敗しました" },
      { status: 500 },
    );
  }
}
