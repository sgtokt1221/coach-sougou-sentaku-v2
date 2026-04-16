import { NextRequest, NextResponse } from "next/server";
import type {
  WeeklyDigest,
  DigestWeakness,
  DigestImprovement,
  DigestNextAction,
  CoachComment,
} from "@/lib/types/weekly-digest";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";

function getUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return "__token__";
  }
  if (process.env.NODE_ENV === "development") {
    const devRole = request.headers.get("X-Dev-Role");
    if (devRole) return "dev-user";
  }
  return null;
}

function generateMockDigest(): WeeklyDigest {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    periodStart: weekAgo.toISOString(),
    periodEnd: now.toISOString(),
    essayCount: 3,
    interviewCount: 2,
    essayAvgScore: 34.2,
    essayScoreChange: 2.1,
    interviewAvgScore: 28.5,
    interviewScoreChange: -0.5,
    topWeaknesses: [
      { area: "論理展開の飛躍", count: 5, level: "critical", sources: ["essay"], lastOccurred: now.toISOString() },
      { area: "具体例の不足", count: 3, level: "warning", sources: ["essay", "interview"], lastOccurred: now.toISOString() },
      { area: "結論の曖昧さ", count: 3, level: "warning", sources: ["essay"], lastOccurred: now.toISOString() },
    ],
    improvements: [
      { area: "誤字脱字", status: "resolved", previousCount: 4 },
      { area: "接続語の使い方", status: "improving", previousCount: 3 },
    ],
    nextAction: {
      suggestion: "論理展開の練習として、要約ドリルに取り組みましょう。短い文章で因果関係を明確にする訓練が効果的です。",
      reason: "「論理展開の飛躍」が5回指摘されており、最優先で改善が必要です。",
      target: "essay",
      href: "/student/essay/summary-drill",
    },
    coachComments: [
      {
        id: "fb1",
        type: "essay",
        targetLabel: "小論文 #12",
        message: "構成力が上がっています。次は具体例の質を意識してみてください。",
        createdByName: "田中先生",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        read: false,
      },
    ],
    overallMessage:
      "今週は小論文3本、面接2回と積極的に取り組めています。論理展開が最大の課題ですが、誤字脱字は克服できました。要約ドリルで論理構成力を強化しましょう。",
  };
}

export async function GET(request: NextRequest) {
  const tempUserId = getUserId(request);
  if (!tempUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId = tempUserId;

  // Firebase token verification
  if (userId === "__token__") {
    const authHeader = request.headers.get("Authorization")!;
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      } else {
        return NextResponse.json(generateMockDigest());
      }
    } catch {
      return NextResponse.json(generateMockDigest());
    }
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json(generateMockDigest());
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Fetch data in parallel
    const [essaySnap, prevEssaySnap, interviewSnap, prevInterviewSnap, weaknessSnap, feedbackSnap] =
      await Promise.all([
        adminDb
          .collection(`users/${userId}/essays`)
          .where("submittedAt", ">=", weekAgo)
          .orderBy("submittedAt", "desc")
          .get(),
        adminDb
          .collection(`users/${userId}/essays`)
          .where("submittedAt", ">=", twoWeeksAgo)
          .where("submittedAt", "<", weekAgo)
          .get(),
        adminDb
          .collection(`users/${userId}/interviews`)
          .where("startedAt", ">=", weekAgo)
          .orderBy("startedAt", "desc")
          .get(),
        adminDb
          .collection(`users/${userId}/interviews`)
          .where("startedAt", ">=", twoWeeksAgo)
          .where("startedAt", "<", weekAgo)
          .get(),
        adminDb.collection(`users/${userId}/weaknesses`).get(),
        adminDb
          .collection(`users/${userId}/feedback`)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),
      ]);

    // --- Essay stats ---
    const essays = essaySnap.docs.map((d) => d.data());
    const prevEssays = prevEssaySnap.docs.map((d) => d.data());
    const scoredEssays = essays.filter((e) => e.scores?.total != null);
    const prevScoredEssays = prevEssays.filter((e) => e.scores?.total != null);

    const essayAvgScore =
      scoredEssays.length > 0
        ? Math.round(
            (scoredEssays.reduce((s, e) => s + e.scores.total, 0) / scoredEssays.length) * 10
          ) / 10
        : null;
    const prevEssayAvg =
      prevScoredEssays.length > 0
        ? prevScoredEssays.reduce((s, e) => s + e.scores.total, 0) / prevScoredEssays.length
        : null;
    const essayScoreChange =
      essayAvgScore != null && prevEssayAvg != null
        ? Math.round((essayAvgScore - prevEssayAvg) * 10) / 10
        : 0;

    // --- Interview stats ---
    const interviews = interviewSnap.docs.map((d) => d.data());
    const prevInterviews = prevInterviewSnap.docs.map((d) => d.data());
    const scoredInterviews = interviews.filter((i) => i.scores?.total != null);
    const prevScoredInterviews = prevInterviews.filter((i) => i.scores?.total != null);

    const interviewAvgScore =
      scoredInterviews.length > 0
        ? Math.round(
            (scoredInterviews.reduce((s, i) => s + i.scores.total, 0) / scoredInterviews.length) *
              10
          ) / 10
        : null;
    const prevInterviewAvg =
      prevScoredInterviews.length > 0
        ? prevScoredInterviews.reduce((s, i) => s + i.scores.total, 0) /
          prevScoredInterviews.length
        : null;
    const interviewScoreChange =
      interviewAvgScore != null && prevInterviewAvg != null
        ? Math.round((interviewAvgScore - prevInterviewAvg) * 10) / 10
        : 0;

    // --- Weaknesses ---
    const weaknesses: WeaknessRecord[] = weaknessSnap.docs.map((d) => {
      const data = d.data();
      return {
        area: data.area,
        count: data.count,
        firstOccurred: data.firstOccurred?.toDate() ?? new Date(),
        lastOccurred: data.lastOccurred?.toDate() ?? new Date(),
        improving: data.improving ?? false,
        resolved: data.resolved ?? false,
        source: data.source ?? "essay",
        reminderDismissedAt: data.reminderDismissedAt?.toDate() ?? null,
      };
    });

    const topWeaknesses: DigestWeakness[] = weaknesses
      .filter((w) => !w.resolved)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((w) => {
        const level = getWeaknessReminderLevel(w);
        return {
          area: w.area,
          count: w.count,
          level: level === "critical" ? "critical" : w.count === 1 ? "new" : "warning",
          sources: [w.source],
          lastOccurred: w.lastOccurred instanceof Date ? w.lastOccurred.toISOString() : String(w.lastOccurred),
        };
      });

    const improvements: DigestImprovement[] = weaknesses
      .filter((w) => w.improving || w.resolved)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((w) => ({
        area: w.area,
        status: w.resolved ? ("resolved" as const) : ("improving" as const),
        previousCount: w.count,
      }));

    // --- Next action ---
    const worstWeakness = topWeaknesses[0];
    let nextAction: DigestNextAction;
    if (worstWeakness) {
      const isEssay =
        worstWeakness.sources.includes("essay") || worstWeakness.sources.includes("both");
      nextAction = {
        suggestion: isEssay
          ? `「${worstWeakness.area}」を意識して次の小論文に取り組みましょう。`
          : `「${worstWeakness.area}」を意識して面接練習を行いましょう。`,
        reason: `${worstWeakness.count}回指摘されており、最優先で改善が必要です。`,
        target: isEssay ? "essay" : "interview",
        href: isEssay ? "/student/essay/new" : "/student/interview/new",
      };
    } else if (essays.length === 0) {
      nextAction = {
        suggestion: "今週は小論文を1本提出してみましょう。",
        reason: "定期的な練習が実力向上の鍵です。",
        target: "essay",
        href: "/student/essay/new",
      };
    } else {
      nextAction = {
        suggestion: "この調子で学習を継続しましょう。",
        reason: "弱点が減少しており、良いペースです。",
        target: "essay",
        href: "/student/dashboard",
      };
    }

    // --- Coach comments ---
    const coachComments: CoachComment[] = feedbackSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          targetLabel: data.targetLabel,
          message: data.message,
          createdByName: data.createdByName,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
          read: data.read ?? false,
        };
      })
      .slice(0, 5);

    // --- Overall message ---
    const totalActivity = essays.length + interviews.length;
    const parts: string[] = [];
    if (totalActivity === 0) {
      parts.push("今週はまだ活動がありません。");
    } else {
      const items: string[] = [];
      if (essays.length > 0) items.push(`小論文${essays.length}本`);
      if (interviews.length > 0) items.push(`面接${interviews.length}回`);
      parts.push(`今週は${items.join("、")}に取り組みました。`);
    }
    if (improvements.length > 0) {
      const resolved = improvements.filter((i) => i.status === "resolved");
      if (resolved.length > 0) {
        parts.push(`「${resolved.map((r) => r.area).join("」「")}」を克服しました。`);
      }
    }
    if (worstWeakness) {
      parts.push(`「${worstWeakness.area}」が最大の課題です。`);
    }

    const digest: WeeklyDigest = {
      periodStart: weekAgo.toISOString(),
      periodEnd: now.toISOString(),
      essayCount: essays.length,
      interviewCount: interviews.length,
      essayAvgScore,
      essayScoreChange,
      interviewAvgScore,
      interviewScoreChange,
      topWeaknesses,
      improvements,
      nextAction,
      coachComments,
      overallMessage: parts.join(""),
    };

    return NextResponse.json(digest);
  } catch (err) {
    console.warn("Failed to generate weekly digest:", err);
    return NextResponse.json(generateMockDigest());
  }
}
