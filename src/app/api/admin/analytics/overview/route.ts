import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AnalyticsOverview } from "@/lib/types/analytics";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    try {
      const essaysSnap = await adminDb.collection("essays").get();
      const interviewsSnap = await adminDb.collection("interviews").get();

      const essays = essaysSnap.docs.map((d) => d.data());
      const interviews = interviewsSnap.docs.map((d) => d.data());

      const totalEssays = essays.length;
      const totalInterviews = interviews.length;

      const essayScores = essays
        .map((e) => e.scores?.total)
        .filter((s): s is number => typeof s === "number");
      const interviewScores = interviews
        .map((i) => i.scores?.total)
        .filter((s): s is number => typeof s === "number");

      const avgEssayScore =
        essayScores.length > 0
          ? Math.round((essayScores.reduce((a, b) => a + b, 0) / essayScores.length) * 10) / 10
          : 0;
      const avgInterviewScore =
        interviewScores.length > 0
          ? Math.round((interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) * 10) / 10
          : 0;

      // Monthly trend from essays
      const monthMap = new Map<string, { essays: number; interviews: number; scores: number[] }>();
      for (const e of essays) {
        const date = e.submittedAt?.toDate?.() ?? new Date(e.submittedAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthMap.get(month) ?? { essays: 0, interviews: 0, scores: [] };
        entry.essays++;
        if (e.scores?.total) entry.scores.push(e.scores.total);
        monthMap.set(month, entry);
      }
      for (const i of interviews) {
        const date = i.startedAt?.toDate?.() ?? new Date(i.startedAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthMap.get(month) ?? { essays: 0, interviews: 0, scores: [] };
        entry.interviews++;
        monthMap.set(month, entry);
      }
      const monthlyTrend = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({
          month,
          essays: data.essays,
          interviews: data.interviews,
          avgScore:
            data.scores.length > 0
              ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
              : 0,
        }));

      // University popularity
      const uniCount = new Map<string, number>();
      for (const e of essays) {
        const name = e.universityName ?? e.universityId ?? "unknown";
        uniCount.set(name, (uniCount.get(name) ?? 0) + 1);
      }
      const universityPopularity = Array.from(uniCount.entries())
        .map(([universityName, count]) => ({ universityName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Score distribution
      const ranges = ["0-10", "11-20", "21-30", "31-40", "41-50"];
      const distribution = ranges.map((range) => ({ range, count: 0 }));
      for (const score of essayScores) {
        const idx = Math.min(Math.floor(score / 10), 4);
        distribution[idx].count++;
      }

      const result: AnalyticsOverview = {
        totalEssays,
        totalInterviews,
        avgEssayScore,
        avgInterviewScore,
        monthlyTrend,
        universityPopularity,
        scoreDistribution: distribution,
      };

      return NextResponse.json(result);
    } catch (err) {
      console.error("Firestore analytics fetch failed:", err);
      return NextResponse.json({ error: "データの取得中にエラーが発生しました" }, { status: 500 });
    }
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json({ error: "分析データの取得中にエラーが発生しました" }, { status: 500 });
  }
}
