import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  ScoreDistribution,
  ScoreDistributionResponse,
} from "@/lib/types/analytics";

const RANGES = ["0-20", "21-40", "41-60", "61-80", "81-100"];

function bucketIndex(score: number, max: number): number {
  const normalized = (score / max) * 100;
  if (normalized <= 20) return 0;
  if (normalized <= 40) return 1;
  if (normalized <= 60) return 2;
  if (normalized <= 80) return 3;
  return 4;
}

function buildDistribution(scores: number[], max: number): ScoreDistribution[] {
  const counts = [0, 0, 0, 0, 0];
  for (const score of scores) {
    counts[bucketIndex(score, max)]++;
  }
  const total = scores.length || 1;
  return RANGES.map((range, i) => ({
    range,
    count: counts[i],
    percentage: Math.round((counts[i] / total) * 1000) / 10,
  }));
}

function getPeriodCutoff(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "180d":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

const MOCK_ESSAY_DIST: ScoreDistribution[] = [
  { range: "0-20", count: 2, percentage: 8.7 },
  { range: "21-40", count: 5, percentage: 21.7 },
  { range: "41-60", count: 8, percentage: 34.8 },
  { range: "61-80", count: 6, percentage: 26.1 },
  { range: "81-100", count: 2, percentage: 8.7 },
];

const MOCK_INTERVIEW_DIST: ScoreDistribution[] = [
  { range: "0-20", count: 1, percentage: 5.6 },
  { range: "21-40", count: 4, percentage: 22.2 },
  { range: "41-60", count: 7, percentage: 38.9 },
  { range: "61-80", count: 4, percentage: 22.2 },
  { range: "81-100", count: 2, percentage: 11.1 },
];

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") ?? "both") as "essay" | "interview" | "both";
    const period = searchParams.get("period") ?? "all";

    if (!adminDb) {
      const response: ScoreDistributionResponse = {
        essay: type !== "interview" ? MOCK_ESSAY_DIST : [],
        interview: type !== "essay" ? MOCK_INTERVIEW_DIST : [],
        type,
        period,
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    const cutoff = getPeriodCutoff(period);

    // Scoping: get managed students for admin/teacher
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
        essay: buildDistribution([], 50),
        interview: buildDistribution([], 40),
        type,
        period,
        generatedAt: new Date().toISOString(),
      } satisfies ScoreDistributionResponse);
    }

    let essayDist: ScoreDistribution[] = [];
    let interviewDist: ScoreDistribution[] = [];

    if (type !== "interview") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let essayQuery: any = adminDb.collection("essays");
      if (cutoff) {
        essayQuery = essayQuery.where("submittedAt", ">=", cutoff);
      }
      const essaysSnap = await essayQuery
        .get()
        .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));
      let essayScores = essaysSnap.docs
        .map((d: { data: () => Record<string, unknown> }) => {
          const data = d.data();
          return {
            userId: data.userId as string,
            score: (data.scores as Record<string, unknown> | undefined)?.total as number | undefined,
          };
        })
        .filter((e: { userId: string; score: number | undefined }): e is { userId: string; score: number } => e.score != null);

      if (studentIdSet) {
        essayScores = essayScores.filter((e: { userId: string }) => studentIdSet.has(e.userId));
      }

      essayDist = buildDistribution(
        essayScores.map((e: { score: number }) => e.score),
        50
      );
    }

    if (type !== "essay") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let interviewQuery: any = adminDb.collection("interviews");
      if (cutoff) {
        interviewQuery = interviewQuery.where("startedAt", ">=", cutoff);
      }
      const interviewsSnap = await interviewQuery
        .get()
        .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));
      let interviewScores = interviewsSnap.docs
        .map((d: { data: () => Record<string, unknown> }) => {
          const data = d.data();
          return {
            userId: data.userId as string,
            score: (data.scores as Record<string, unknown> | undefined)?.total as number | undefined,
          };
        })
        .filter((e: { userId: string; score: number | undefined }): e is { userId: string; score: number } => e.score != null);

      if (studentIdSet) {
        interviewScores = interviewScores.filter((e: { userId: string }) => studentIdSet.has(e.userId));
      }

      interviewDist = buildDistribution(
        interviewScores.map((e) => e.score),
        40
      );
    }

    const response: ScoreDistributionResponse = {
      essay: essayDist,
      interview: interviewDist,
      type,
      period,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Score distribution error:", error);
    return NextResponse.json(
      { error: "スコア分布データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
