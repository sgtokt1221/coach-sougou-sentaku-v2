import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * GET /api/admin/students/[id]/homework
 *
 * 指定生徒の宿題一覧を全ステータス含めて取得する (講師の管理ダッシュボード用)。
 * managedBy スコーピングを適用 (superadmin は全件)。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    return NextResponse.json([]);
  }

  try {
    const { id: studentId } = await params;

    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    const snap = await adminDb
      .collection(`users/${studentId}/homeworkAssignments`)
      .get();

    const items: HomeworkAssignment[] = snap.docs.map((d) => {
      const data = d.data() as Omit<HomeworkAssignment, "assignedAt"> & {
        assignedAt?: string | { toDate?: () => Date };
        submittedAt?: string | { toDate?: () => Date };
        reviewedAt?: string | { toDate?: () => Date };
      };
      const toIso = (v: typeof data.assignedAt): string | undefined => {
        if (!v) return undefined;
        if (typeof v === "string") return v;
        if (typeof v === "object" && typeof v.toDate === "function") {
          return v.toDate().toISOString();
        }
        return undefined;
      };
      return {
        ...data,
        id: d.id,
        assignedAt: toIso(data.assignedAt) ?? new Date().toISOString(),
        ...(data.submittedAt ? { submittedAt: toIso(data.submittedAt) } : {}),
        ...(data.reviewedAt ? { reviewedAt: toIso(data.reviewedAt) } : {}),
      };
    });

    // ステータス順 → 締切順でソート
    const statusOrder: Record<HomeworkAssignment["status"], number> = {
      assigned: 0,
      in_progress: 1,
      submitted: 2,
      reviewed: 3,
    };
    items.sort((a, b) => {
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[admin/students/homework] error:", error);
    return NextResponse.json(
      { error: "宿題一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/students/[id]/homework
 *
 * 成長レポートに紐づかない「カスタム宿題」を直接作成して配布する。
 * 管理者が任意のタイトル・ヒント・締切で課題を出せる。
 *
 * sourceReportId は "manual" 固定。type/title は必須、それ以外は任意。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore に接続できません" },
      { status: 500 },
    );
  }

  try {
    const { id: studentId } = await params;

    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    const body = (await request.json()) as {
      type?: "essay" | "interview";
      title?: string;
      hints?: string[];
      objective?: string;
      relatedWeakness?: string;
      estimatedMinutes?: number;
      dueDate?: string;
      essayThemeId?: string;
      pastQuestionId?: string;
    };

    if (body.type !== "essay" && body.type !== "interview") {
      return NextResponse.json(
        { error: "type は essay または interview を指定してください" },
        { status: 400 },
      );
    }
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "title は必須です" },
        { status: 400 },
      );
    }

    // 学生の志望校情報 (1校目を AP コンテキストに使う)
    const targetUniversities = Array.isArray(userData.targetUniversities)
      ? (userData.targetUniversities as string[])
      : [];
    const firstTarget = targetUniversities[0]?.split(":");
    const defaultUniversity = firstTarget?.[0];
    const defaultFaculty = firstTarget?.[1];

    const timestamp = Date.now();
    const assignmentId = `hw_manual_${timestamp}`;
    const practiceQuestionId = `manual_${timestamp}`;

    const snapshot: HomeworkAssignment["snapshot"] = {
      type: body.type,
      title: body.title.trim(),
    };
    if (Array.isArray(body.hints)) {
      const hints = body.hints
        .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
        .slice(0, 5);
      if (hints.length > 0) snapshot.hints = hints;
    }
    if (typeof body.objective === "string" && body.objective.trim().length > 0) {
      snapshot.objective = body.objective.trim();
    }
    if (
      typeof body.relatedWeakness === "string" &&
      body.relatedWeakness.trim().length > 0
    ) {
      snapshot.relatedWeakness = body.relatedWeakness.trim();
    }
    if (typeof body.estimatedMinutes === "number" && body.estimatedMinutes > 0) {
      snapshot.estimatedMinutes = Math.round(body.estimatedMinutes);
    }
    if (typeof body.essayThemeId === "string" && body.essayThemeId.trim()) {
      snapshot.essayThemeId = body.essayThemeId.trim();
    }
    if (typeof body.pastQuestionId === "string" && body.pastQuestionId.trim()) {
      snapshot.pastQuestionId = body.pastQuestionId.trim();
    }
    if (defaultUniversity) snapshot.targetUniversity = defaultUniversity;
    if (defaultFaculty) snapshot.targetFaculty = defaultFaculty;

    const assignment: HomeworkAssignment = {
      id: assignmentId,
      studentId,
      sourceReportId: "manual",
      practiceQuestionId,
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

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("[admin/students/homework POST] error:", error);
    return NextResponse.json(
      {
        error: "カスタム宿題の作成に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
