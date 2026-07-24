import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/essay/lecture/history?userId=current
 * 小論文講座の受講状況。講義ごとの最高得点・最終受講日・essayId を返す（一覧の「受講済み」表示用）。
 * データ元は essays コレクション (sourceType="lecture")。
 */
export interface LectureProgressItem {
  lectureId: string;
  essayId: string;
  total: number;
  scoreMaximum: number;
  completedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    if (!userId || userId === "current") {
      userId = null;
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { adminAuth } = await import("@/lib/firebase/admin");
          if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
            userId = decoded.uid;
          }
        } catch (e) {
          console.error("[essay/lecture/history] token verify failed:", e);
        }
      }
      if (!userId && process.env.NODE_ENV === "development") {
        const devRole = request.headers.get("X-Dev-Role");
        if (devRole) userId = "dev-user";
      }
    }

    if (!userId) return NextResponse.json([]);

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return NextResponse.json([]);

    const snap = await adminDb
      .collection("essays")
      .where("userId", "==", userId)
      .get();

    // lectureId ごとに最高得点を採用
    const best = new Map<string, LectureProgressItem>();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.sourceType !== "lecture" || !d.lectureId) continue;
      const total = d.scores?.total ?? 0;
      const completedAt =
        d.reviewedAt?.toDate?.()?.toISOString() ??
        d.submittedAt?.toDate?.()?.toISOString() ??
        new Date().toISOString();
      const prev = best.get(d.lectureId);
      if (!prev || total > prev.total) {
        best.set(d.lectureId, {
          lectureId: d.lectureId,
          essayId: doc.id,
          total,
          scoreMaximum: d.feedback?.scoreMaximum ?? 50,
          completedAt,
        });
      }
    }

    return NextResponse.json([...best.values()]);
  } catch (error) {
    console.error("[essay/lecture/history] error:", error);
    return NextResponse.json([]);
  }
}
