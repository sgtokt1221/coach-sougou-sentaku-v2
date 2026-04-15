import { NextRequest, NextResponse } from "next/server";
import type {
  AcademicCategory,
  SkillCheckResult,
  SkillCheckStatus,
  SkillRank,
} from "@/lib/types/skill-check";
import { SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/skill-check";
import { computeEssayAggregate } from "@/lib/skill-check/aggregate";

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") {
    userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");

  const emptyStatus: SkillCheckStatus = {
    latestResult: null,
    history: [],
    daysSinceLast: null,
    needsRefresh: false,
    currentCategory: null,
  };

  if (!adminDb) {
    return NextResponse.json(emptyStatus);
  }

  try {
    const [userDoc, historySnap] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb
        .collection(`users/${userId}/skillChecks`)
        .orderBy("takenAt", "desc")
        .limit(6)
        .get(),
    ]);

    const userData = userDoc.exists ? userDoc.data()! : {};
    const history: SkillCheckResult[] = historySnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId: r.userId ?? userId!,
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
    const lastTaken = userData.lastSkillCheckedAt?.toDate?.() ?? latestResult?.takenAt ?? null;
    const daysSinceLast = lastTaken
      ? Math.floor((Date.now() - new Date(lastTaken).getTime()) / 86400000)
      : null;
    const needsRefresh =
      daysSinceLast !== null && daysSinceLast >= SKILL_CHECK_REFRESH_DAYS;

    const aggregate = await computeEssayAggregate(
      userId,
      latestResult?.scores.total ?? null,
    );

    const status: SkillCheckStatus = {
      latestResult,
      history,
      daysSinceLast,
      needsRefresh,
      currentCategory: (userData.academicCategory ?? null) as AcademicCategory | null,
      aggregate,
    };

    return NextResponse.json(status);
  } catch (err) {
    console.warn("Skill check status fetch failed:", err);
    return NextResponse.json(emptyStatus);
  }
}
