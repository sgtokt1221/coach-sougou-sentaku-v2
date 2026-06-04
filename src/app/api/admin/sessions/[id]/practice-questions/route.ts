import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session } from "@/lib/types/session";
import type { PracticeQuestion } from "@/lib/types/growth-report";

/**
 * PATCH /api/admin/sessions/[id]/practice-questions
 *
 * セッションにセット生成された類題 (practiceQuestions) を講師が編集して保存する。
 * 生成は generate-plan (台本とセット) が担うため、ここでは上書き保存のみ。
 */

/** 文字列配列を軽くサニタイズ (空要素除去・件数/文字数制限) */
function cleanStringArray(v: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.slice(0, maxLen))
    .slice(0, maxItems);
  return out.length > 0 ? out : undefined;
}

/**
 * 講師編集後の PracticeQuestion を保存用に整形する。
 * normalizePracticeQuestion は homeworkAssignable を落とすため、
 * 編集保存ではトグル等の編集可能フィールドを保持する独自整形を使う。
 */
function sanitizePracticeQuestion(
  raw: Partial<PracticeQuestion>,
  index: number,
): PracticeQuestion {
  const type: "essay" | "interview" = raw.type === "interview" ? "interview" : "essay";
  const q: PracticeQuestion = {
    id: typeof raw.id === "string" && raw.id ? raw.id : `pq_edit_${index}`,
    type,
    title: typeof raw.title === "string" ? raw.title.slice(0, 300) : "",
    order: index,
  };
  if (raw.priority === "primary" || raw.priority === "secondary") q.priority = raw.priority;
  if (raw.usage === "lesson" || raw.usage === "homework" || raw.usage === "extra") {
    q.usage = raw.usage;
  }
  if (typeof raw.relatedWeakness === "string" && raw.relatedWeakness.trim()) {
    q.relatedWeakness = raw.relatedWeakness.slice(0, 300);
  }
  if (typeof raw.relatedPastTopic === "string" && raw.relatedPastTopic.trim()) {
    q.relatedPastTopic = raw.relatedPastTopic.slice(0, 200);
  }
  if (typeof raw.modelAnswer === "string" && raw.modelAnswer.trim()) {
    q.modelAnswer = raw.modelAnswer.slice(0, 2000);
  }
  if (raw.difficulty === "basic" || raw.difficulty === "standard" || raw.difficulty === "advanced") {
    q.difficulty = raw.difficulty;
  }
  if (typeof raw.estimatedMinutes === "number" && raw.estimatedMinutes > 0) {
    q.estimatedMinutes = Math.round(raw.estimatedMinutes);
  }
  if (typeof raw.objective === "string" && raw.objective.trim()) {
    q.objective = raw.objective.slice(0, 300);
  }
  const rubric = cleanStringArray(raw.rubric, 5, 200);
  if (rubric) q.rubric = rubric;
  const hints = cleanStringArray(raw.hints, 5, 200);
  if (hints) q.hints = hints;
  if (typeof raw.teacherNotes === "string" && raw.teacherNotes.trim()) {
    q.teacherNotes = raw.teacherNotes.slice(0, 500);
  }
  if (
    raw.answerVisibility === "teacher_only" ||
    raw.answerVisibility === "after_submission" ||
    raw.answerVisibility === "student_visible"
  ) {
    q.answerVisibility = raw.answerVisibility;
  }
  if (typeof raw.homeworkAssignable === "boolean") {
    q.homeworkAssignable = raw.homeworkAssignable;
  }
  if (type === "interview") {
    const fus = cleanStringArray(raw.followUpQuestions, 4, 200);
    if (fus) q.followUpQuestions = fus;
  }
  return q;
}

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
    practiceQuestions?: Array<Partial<PracticeQuestion>>;
  } | null;
  if (!body || !Array.isArray(body.practiceQuestions)) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const practiceQuestions = body.practiceQuestions
    .map((q, i) => sanitizePracticeQuestion(q, i))
    .filter((q) => q.title.trim().length > 0)
    .slice(0, 8);

  await ref.set(
    { practiceQuestions, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  return NextResponse.json({ practiceQuestions });
}
