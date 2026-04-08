import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { MonthlyTrend, MonthlyTrendsResponse } from "@/lib/types/analytics";

function generateMockTrends(months: number): MonthlyTrend[] {
  const trends: MonthlyTrend[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    // Use deterministic pseudo-random based on month string
    const seed = month.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const base = 55 + (seed % 15);
    trends.push({
      month,
      essayAvg: base + ((seed * 3) % 10),
      interviewAvg: base + ((seed * 7) % 8) - 2,
      studentCount: 3 + (seed % 5),
      submissionCount: 5 + ((seed * 2) % 15),
    });
  }
  return trends;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const months = Math.min(
      Math.max(parseInt(searchParams.get("months") ?? "12", 10) || 12, 1),
      24
    );

    if (!adminDb) {
      const response: MonthlyTrendsResponse = {
        trends: generateMockTrends(months),
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Scoping
    const studentIdSet: Set<string> | null = await (async () => {
      if (role === "superadmin") return null;
      const studentsSnap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .where("managedBy", "==", uid)
        .get();
      return new Set(studentsSnap.docs.map((d) => d.id));
    })();

    if (studentIdSet && studentIdSet.size === 0) {
      return NextResponse.json({
        trends: [],
        generatedAt: new Date().toISOString(),
      } satisfies MonthlyTrendsResponse);
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const essaysSnap = await adminDb
      .collection("essays")
      .where("submittedAt", ">=", cutoffDate)
      .get()
      .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));

    const interviewsSnap = await adminDb
      .collection("interviews")
      .where("startedAt", ">=", cutoffDate)
      .get()
      .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));

    const monthMap = new Map<
      string,
      {
        essayScores: number[];
        interviewScores: number[];
        studentSet: Set<string>;
        submissionCount: number;
      }
    >();

    for (const doc of essaysSnap.docs) {
      const data = doc.data();
      const userId = data.userId as string;
      if (studentIdSet && !studentIdSet.has(userId)) continue;

      const date = data.submittedAt?.toDate?.() ?? new Date(data.submittedAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(month)) {
        monthMap.set(month, {
          essayScores: [],
          interviewScores: [],
          studentSet: new Set(),
          submissionCount: 0,
        });
      }
      const entry = monthMap.get(month)!;
      entry.submissionCount++;
      entry.studentSet.add(userId);
      if (typeof data.scores?.total === "number") {
        entry.essayScores.push((data.scores.total / 50) * 100);
      }
    }

    for (const doc of interviewsSnap.docs) {
      const data = doc.data();
      const userId = data.userId as string;
      if (studentIdSet && !studentIdSet.has(userId)) continue;

      const date = data.startedAt?.toDate?.() ?? new Date(data.startedAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(month)) {
        monthMap.set(month, {
          essayScores: [],
          interviewScores: [],
          studentSet: new Set(),
          submissionCount: 0,
        });
      }
      const entry = monthMap.get(month)!;
      entry.submissionCount++;
      entry.studentSet.add(userId);
      if (typeof data.scores?.total === "number") {
        entry.interviewScores.push((data.scores.total / 40) * 100);
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : 0;

    const trends: MonthlyTrend[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-months)
      .map(([month, data]) => ({
        month,
        essayAvg: avg(data.essayScores),
        interviewAvg: avg(data.interviewScores),
        studentCount: data.studentSet.size,
        submissionCount: data.submissionCount,
      }));

    const response: MonthlyTrendsResponse = {
      trends,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Monthly trends error:", error);
    return NextResponse.json(
      { error: "月次推移データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
