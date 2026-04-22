import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session, LessonPrepPlan } from "@/lib/types/session";

/** PATCH /api/admin/sessions/[id]/prep-plan  講師編集用 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  const body = (await request.json().catch(() => null)) as {
    goal?: string;
    questions?: string[];
    cautions?: string[];
  } | null;
  if (!body) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const existing: Partial<LessonPrepPlan> = session.prepPlan ?? {};
  const patch: LessonPrepPlan = {
    goal: typeof body.goal === "string" ? body.goal.slice(0, 500) : existing.goal ?? "",
    questions: Array.isArray(body.questions)
      ? body.questions.map((q) => String(q).slice(0, 300)).slice(0, 10)
      : existing.questions ?? [],
    cautions: Array.isArray(body.cautions)
      ? body.cautions.map((c) => String(c).slice(0, 300)).slice(0, 8)
      : existing.cautions ?? [],
    generatedAt: existing.generatedAt ?? new Date().toISOString(),
    generatedBy: "ai_then_teacher",
  };

  await ref.set(
    { prepPlan: patch, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  return NextResponse.json({ prepPlan: patch });
}
