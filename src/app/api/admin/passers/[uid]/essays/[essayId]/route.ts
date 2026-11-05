import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { loadPasserForCaller, passerIso } from "@/lib/passers/passer-access";
import { withTeacherEdits } from "@/lib/essay/teacher-edits";
import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";

/**
 * GET /api/admin/passers/[uid]/essays/[essayId]
 * 合格者の答案1件（本文・設問・点・講評）。読むだけ。既読は付けない。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; essayId: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { uid, essayId } = await params;
  try {
    const p = await loadPasserForCaller(adminDb, auth, uid);
    if (p instanceof NextResponse) return p;
    const snap = await adminDb.doc(`essays/${essayId}`).get();
    const data = snap.data();
    if (!snap.exists || !data || data.userId !== uid) {
      return NextResponse.json({ error: "答案が見つかりません" }, { status: 404 });
    }
    const ctx = data.questionContext ?? {};
    return NextResponse.json({
      id: snap.id,
      topic: data.topic ?? "",
      submittedAt: passerIso(data.submittedAt),
      ocrText: data.ocrText ?? "",
      questionType: ctx.questionType ?? null,
      sourceText: ctx.sourceText ?? null,
      wordLimit: ctx.wordLimit ?? null,
      scores: data.scores ?? null,
      feedback: data.feedback
        ? withTeacherEdits(
            feedbackWithDerivedIssues(data.feedback, data.sentenceCheck, {
              partial: isPartialEssay(data),
            }),
            data.teacherEdits
          )
        : null,
      teacherEdit: data.teacherEdits?.score ?? null,
    });
  } catch (error) {
    console.error("passer essay error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
