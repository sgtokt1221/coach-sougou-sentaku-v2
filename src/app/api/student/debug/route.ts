import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";

/**
 * 一時的なデバッグエンドポイント。レーダーチャート未描画の原因特定用。
 * 自分の uid のレポート / essays / interviews の生 Firestore データ形状のみ返す。
 * 原因特定後は削除する。
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth || !adminDb) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const describe = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (v instanceof Date) return `Date(${v.toISOString()})`;
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if (typeof obj.toDate === "function") return "Timestamp(has toDate)";
      if ("_seconds" in obj || "seconds" in obj) {
        const sec = (obj._seconds ?? obj.seconds) as number;
        return `TimestampLike({_seconds:${sec},iso:${new Date(sec * 1000).toISOString()}})`;
      }
      return `Object(keys:[${Object.keys(obj).join(",")}])`;
    }
    return `${typeof v}(${String(v)})`;
  };

  const reportsSnap = await adminDb
    .collection(`users/${auth.uid}/growthReports`)
    .limit(5)
    .get();
  const essaysSnap = await adminDb
    .collection("essays")
    .where("userId", "==", auth.uid)
    .limit(5)
    .get();
  const interviewsSnap = await adminDb
    .collection("interviews")
    .where("userId", "==", auth.uid)
    .limit(5)
    .get();

  return NextResponse.json({
    uid: auth.uid,
    reports: reportsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        period: data.period,
        startDate_type: describe(data.startDate),
        endDate_type: describe(data.endDate),
        generatedAt_type: describe(data.generatedAt),
        essayStats: {
          count: data.essayStats?.count,
          avgScore: data.essayStats?.avgScore,
          bestCategory: data.essayStats?.bestCategory,
          worstCategory: data.essayStats?.worstCategory,
          hasCategoryAverages: !!data.essayStats?.categoryAverages,
          categoryAverages: data.essayStats?.categoryAverages ?? null,
        },
        interviewStats: {
          count: data.interviewStats?.count,
          avgScore: data.interviewStats?.avgScore,
          hasCategoryAverages: !!data.interviewStats?.categoryAverages,
          categoryAverages: data.interviewStats?.categoryAverages ?? null,
        },
      };
    }),
    essays_sample: essaysSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        submittedAt_type: describe(data.submittedAt),
        scores_keys: data.scores ? Object.keys(data.scores) : null,
        scores: data.scores
          ? {
              total: data.scores.total,
              structure: data.scores.structure,
              logic: data.scores.logic,
              expression: data.scores.expression,
              apAlignment: data.scores.apAlignment,
              originality: data.scores.originality,
            }
          : null,
      };
    }),
    interviews_sample: interviewsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        startedAt_type: describe(data.startedAt),
        scores_keys: data.scores ? Object.keys(data.scores) : null,
        scores: data.scores
          ? {
              total: data.scores.total,
              logic: data.scores.logic,
              expression: data.scores.expression,
              passion: data.scores.passion,
              apAlignment: data.scores.apAlignment,
            }
          : null,
      };
    }),
  });
}
