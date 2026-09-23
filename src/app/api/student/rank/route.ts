import { NextRequest, NextResponse } from "next/server";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "@/lib/skill-check/aggregate";
import type { StudentRankResponse } from "@/lib/types/rank";

/**
 * 生徒本人のランク（小論文・面接）。直近10件の提出の平均だけで決める。
 * 以前は /api/skill-check/status・/api/interview-skill-check/status に相乗りしていた
 * （スキルチェックは 2026-09-23 に廃止）。
 */
export async function GET(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        userId = (await adminAuth.verifyIdToken(authHeader.slice(7))).uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") userId = "dev-user";
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const [essay, interview] = await Promise.all([
    computeEssayAggregate(userId),
    computeInterviewAggregate(userId),
  ]);
  return NextResponse.json<StudentRankResponse>({ essay, interview });
}
