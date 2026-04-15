import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type {
  InterviewSkillCheckResult,
  InterviewSkillCheckStatus,
} from "@/lib/types/interview-skill-check";
import { INTERVIEW_SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/interview-skill-check";
import type { SkillRank } from "@/lib/types/skill-check";
import { computeInterviewAggregate } from "@/lib/skill-check/aggregate";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid: requesterUid, role } = auth;
  const { id: studentId } = await context.params;

  const empty: InterviewSkillCheckStatus = {
    latestResult: null,
    history: [],
    daysSinceLast: null,
    needsRefresh: false,
  };

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json(empty);

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
        .collection(`users/${studentId}/interviewSkillChecks`)
        .orderBy("takenAt", "desc")
        .limit(6)
        .get(),
    ]);
    const userData = userDoc.exists ? userDoc.data()! : {};
    const history: InterviewSkillCheckResult[] = historySnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId: studentId,
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
      studentId,
      latestResult?.scores.total ?? null,
    );
    return NextResponse.json({
      latestResult,
      history,
      daysSinceLast,
      needsRefresh:
        daysSinceLast !== null && daysSinceLast >= INTERVIEW_SKILL_CHECK_REFRESH_DAYS,
      aggregate,
    });
  } catch (err) {
    console.warn("admin interview skill check fetch failed:", err);
    return NextResponse.json(empty);
  }
}
