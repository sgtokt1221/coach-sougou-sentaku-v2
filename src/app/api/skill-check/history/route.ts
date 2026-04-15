import { NextRequest, NextResponse } from "next/server";
import type { SkillCheckResult, SkillRank } from "@/lib/types/skill-check";

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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "6"), 20);

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json({ history: [] });

  try {
    const snap = await adminDb
      .collection(`users/${userId}/skillChecks`)
      .orderBy("takenAt", "desc")
      .limit(limit)
      .get();
    const history: SkillCheckResult[] = snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        userId,
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
    return NextResponse.json({ history });
  } catch (err) {
    console.warn("history fetch failed:", err);
    return NextResponse.json({ history: [] });
  }
}
