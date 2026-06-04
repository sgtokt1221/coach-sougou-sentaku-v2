import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type {
  HomeworkAssignment,
  AssignHomeworkRequest,
  AssignHomeworkResponse,
} from "@/lib/types/homework";
import type { Session } from "@/lib/types/session";
import type { PracticeQuestion } from "@/lib/types/growth-report";

/**
 * POST /api/admin/sessions/[id]/assign-homework
 *
 * セッションにセット生成された practiceQuestion を宿題として配布する。
 * レポート版 (reports/[studentId]/[reportId]/assign-homework) と同一ロジックだが、
 * - 認可: assertSessionAccess (担当講師 / 管理者 / superadmin)
 * - データ源: session.practiceQuestions
 * - 配布元 ID: sourceReportId に sessionId を保存
 *
 * DELETE /api/admin/sessions/[id]/assign-homework?practiceQuestionId=xxx で配布取消。
 * GET で配布済み一覧。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 },
      );
    }

    const snap = await adminDb.doc(`sessions/${id}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = { id: snap.id, ...snap.data() } as Session;
    const accessError = await assertSessionAccess(adminDb, session, auth);
    if (accessError) return accessError;

    const studentId = session.studentId;

    // リクエスト解析
    const body = (await request.json()) as AssignHomeworkRequest;
    const practiceQuestionIds = Array.isArray(body.practiceQuestionIds)
      ? body.practiceQuestionIds.filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        )
      : [];
    if (practiceQuestionIds.length === 0) {
      return NextResponse.json(
        { error: "practiceQuestionIds は必須です" },
        { status: 400 },
      );
    }

    const practiceQuestions: PracticeQuestion[] = Array.isArray(session.practiceQuestions)
      ? session.practiceQuestions
      : [];

    // 学生の志望校情報 (1校目を AP コンテキストに使う)
    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    const userData = userDoc.exists ? userDoc.data()! : {};
    const targetUniversities = Array.isArray(userData.targetUniversities)
      ? (userData.targetUniversities as string[])
      : [];
    const firstTarget = targetUniversities[0]?.split(":");
    const defaultUniversity = firstTarget?.[0];
    const defaultFaculty = firstTarget?.[1];

    // 既に配布済みの practiceQuestionId を取得 (このセッション由来のもの)
    const existing = await adminDb
      .collection(`users/${studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", id)
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
      // 配布不可フラグが明示的に false の類題はサーバー側でも弾く
      if (pq.homeworkAssignable === false) {
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
        sourceReportId: id,
        practiceQuestionId: pqId,
        snapshot,
        status: "assigned",
        assignedAt: new Date().toISOString(),
        assignedBy: auth.uid,
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
    console.error("[sessions/assign-homework] error:", error);
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
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const practiceQuestionId = request.nextUrl.searchParams.get("practiceQuestionId");
    if (!practiceQuestionId) {
      return NextResponse.json(
        { error: "practiceQuestionId クエリは必須です" },
        { status: 400 },
      );
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません" },
        { status: 500 },
      );
    }

    const snap = await adminDb.doc(`sessions/${id}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = { id: snap.id, ...snap.data() } as Session;
    const accessError = await assertSessionAccess(adminDb, session, auth);
    if (accessError) return accessError;

    const matches = await adminDb
      .collection(`users/${session.studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", id)
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
    console.error("[sessions/assign-homework DELETE] error:", error);
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
 * GET /api/admin/sessions/[id]/assign-homework
 *
 * このセッションから配布済みの宿題一覧。UI で配布済み判定に使う。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json([]);
    }

    const snap = await adminDb.doc(`sessions/${id}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = { id: snap.id, ...snap.data() } as Session;
    const accessError = await assertSessionAccess(adminDb, session, auth);
    if (accessError) return accessError;

    const assignmentsSnap = await adminDb
      .collection(`users/${session.studentId}/homeworkAssignments`)
      .where("sourceReportId", "==", id)
      .get();

    const items: HomeworkAssignment[] = assignmentsSnap.docs.map((d) => {
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
    console.error("[sessions/assign-homework GET] error:", error);
    return NextResponse.json(
      { error: "配布状況の取得に失敗しました" },
      { status: 500 },
    );
  }
}
