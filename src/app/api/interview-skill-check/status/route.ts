import { NextRequest, NextResponse } from "next/server";
import type {
  InterviewSkillCheckResult,
  InterviewSkillCheckStatus,
} from "@/lib/types/interview-skill-check";
import { INTERVIEW_SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/interview-skill-check";
import type { SkillRank } from "@/lib/types/skill-check";
import { computeInterviewAggregate } from "@/lib/skill-check/aggregate";

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
  if (!userId && process.env.NODE_ENV === "development") userId = "dev-user";
  if (!userId) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const empty: InterviewSkillCheckStatus = {
    latestResult: null,
    history: [],
    daysSinceLast: null,
    needsRefresh: false,
  };

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json(empty);

  try {
    const [userDoc, historySnap] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb
        .collection(`users/${userId}/interviewSkillChecks`)
        .orderBy("takenAt", "desc")
        .limit(6)
        .get(),
    ]);

    const userData = userDoc.exists ? userDoc.data()! : {};
    const history: InterviewSkillCheckResult[] = historySnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId: userId!,
        scores: r.scores,
        rank: r.rank as SkillRank,
        feedback: r.feedback,
        messages: r.messages ?? [],
        durationSec: r.durationSec ?? 0,
        turnCount: r.turnCount ?? 0,
        takenAt: r.takenAt?.toDate?.() ?? new Date(),
        version: "v1",
      };
    });

    const latestResult = history[0] ?? null;
    const lastTaken =
      userData.lastInterviewCheckedAt?.toDate?.() ?? latestResult?.takenAt ?? null;
    const daysSinceLast = lastTaken
      ? Math.floor((Date.now() - new Date(lastTaken).getTime()) / 86400000)
      : null;

    const aggregate = await computeInterviewAggregate(
      userId,
      latestResult?.scores.total ?? null,
    );
    const status: InterviewSkillCheckStatus = {
      latestResult,
      history,
      daysSinceLast,
      needsRefresh:
        daysSinceLast !== null && daysSinceLast >= INTERVIEW_SKILL_CHECK_REFRESH_DAYS,
      aggregate,
    };
    return NextResponse.json(status);
  } catch (err) {
    console.warn("interview skill check status failed:", err);
    return NextResponse.json(empty);
  }
}
