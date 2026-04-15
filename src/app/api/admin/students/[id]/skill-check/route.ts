import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type {
  AcademicCategory,
  SkillCheckResult,
  SkillCheckStatus,
  SkillRank,
} from "@/lib/types/skill-check";
import { SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/skill-check";
import { computeEssayAggregate } from "@/lib/skill-check/aggregate";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid: requesterUid, role } = auth;
  const { id: studentId } = await context.params;

  const { adminDb } = await import("@/lib/firebase/admin");

  const empty: SkillCheckStatus = {
    latestResult: null,
    history: [],
    daysSinceLast: null,
    needsRefresh: false,
    currentCategory: null,
  };

  if (!adminDb) return NextResponse.json(empty);

  // managedBy スコーピング
  if (role !== "superadmin") {
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists || studentDoc.data()?.managedBy !== requesterUid) {
      return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
    }
  }

  try {
    const [userDoc, historySnap] = await Promise.all([
      adminDb.doc(`users/${studentId}`).get(),
      adminDb
        .collection(`users/${studentId}/skillChecks`)
        .orderBy("takenAt", "desc")
        .limit(6)
        .get(),
    ]);

    const userData = userDoc.exists ? userDoc.data()! : {};
    const history: SkillCheckResult[] = historySnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId: studentId,
        category: r.category,
        questionId: r.questionId,
        essayText: r.essayText,
        wordCount: r.wordCount ?? 0,
        durationSec: r.durationSec ?? 0,
        scores: r.scores,
        rank: r.rank as SkillRank,
        feedback: r.feedback,
        takenAt: r.takenAt?.toDate?.() ?? new Date(),
        version: "v1",
      };
    });
    const latestResult = history[0] ?? null;
    const lastTaken =
      userData.lastSkillCheckedAt?.toDate?.() ?? latestResult?.takenAt ?? null;
    const daysSinceLast = lastTaken
      ? Math.floor((Date.now() - new Date(lastTaken).getTime()) / 86400000)
      : null;

    const aggregate = await computeEssayAggregate(
      studentId,
      latestResult?.scores.total ?? null,
    );
    const status: SkillCheckStatus = {
      latestResult,
      history,
      daysSinceLast,
      needsRefresh:
        daysSinceLast !== null && daysSinceLast >= SKILL_CHECK_REFRESH_DAYS,
      currentCategory: (userData.academicCategory ?? null) as AcademicCategory | null,
      aggregate,
    };
    return NextResponse.json(status);
  } catch (err) {
    console.warn("admin skill-check fetch failed:", err);
    return NextResponse.json(empty);
  }
}
