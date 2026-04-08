import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { getFeaturesByPlan } from "@/lib/stripe/plans";
import type { FeatureFlags } from "@/lib/types/subscription";

const FEATURE_NAMES_JA: Record<keyof FeatureFlags, string> = {
  essayReview: "小論文添削",
  interviewPractice: "模擬面接",
  growthTracking: "成長トラッキング",
  passedData: "合格者データ",
  voiceAnalysis: "音声分析",
  documentEditor: "出願書類エディタ",
  activityManager: "活動実績管理",
  apOptimization: "AP最適化",
};

/**
 * Feature gate middleware for API routes.
 * Checks if the authenticated user has access to the specified feature.
 *
 * Returns null if access is granted, or a NextResponse with 403 if denied.
 *
 * Usage:
 *   const gateResult = await requireFeature(request, 'documentEditor');
 *   if (gateResult) return gateResult;
 */
export async function requireFeature(
  request: NextRequest,
  feature: keyof FeatureFlags
): Promise<NextResponse | null> {
  // In development without admin SDK, allow all features
  if (process.env.NODE_ENV === "development" && !adminDb) {
    return null;
  }

  const auth = await verifyAuthToken(request);

  // Dev mode bypass
  if (!auth && process.env.NODE_ENV === "development") {
    return null;
  }

  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Admin/teacher/superadmin always have access to all features
  if (["admin", "teacher", "superadmin"].includes(auth.role)) {
    return null;
  }

  if (!adminDb) {
    // No Firestore available - allow in dev
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const userDoc = await adminDb.doc(`users/${auth.uid}`).get();
  const userData = userDoc.data();

  let features: FeatureFlags;

  if (userData?.features) {
    features = userData.features as FeatureFlags;
  } else {
    // Compute from plan if features not stored
    const plan = userData?.plan ?? "free";
    const hasDocPackage = userData?.documentPackage?.purchased === true;
    features = getFeaturesByPlan(plan, hasDocPackage);
  }

  if (!features[feature]) {
    const featureName = FEATURE_NAMES_JA[feature];
    return NextResponse.json(
      {
        error: `${featureName}機能を利用するにはプランのアップグレードが必要です`,
        requiredFeature: feature,
        upgradeUrl: "/student/pricing",
      },
      { status: 403 }
    );
  }

  return null;
}
