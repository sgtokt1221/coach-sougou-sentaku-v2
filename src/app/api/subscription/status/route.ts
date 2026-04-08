import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import { getFeaturesByPlan } from "@/lib/stripe/plans";
import type { UserSubscription } from "@/lib/types/subscription";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    const uid = auth?.uid ?? (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Dev mode without Firebase
    if (!adminDb) {
      // In dev mode, check localStorage-backed devPlan via header
      const devPlan = request.headers.get("X-Dev-Plan");
      const plan = devPlan === "standard" ? "standard" : "free";
      const hasDocPackage = devPlan === "document_package";

      const subscription: UserSubscription = {
        plan: plan as "free" | "standard",
        documentPackage: {
          purchased: hasDocPackage,
          purchasedAt: hasDocPackage ? new Date().toISOString() : undefined,
        },
        features: getFeaturesByPlan(plan as "free" | "standard", hasDocPackage),
      };

      if (plan === "standard") {
        subscription.standardSubscription = {
          status: "active",
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          cancelAtPeriodEnd: false,
        };
      }

      return NextResponse.json({ subscription });
    }

    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const userData = userDoc.data();

    if (!userData) {
      const defaultSubscription: UserSubscription = {
        plan: "free",
        documentPackage: { purchased: false },
        features: getFeaturesByPlan("free", false),
      };
      return NextResponse.json({ subscription: defaultSubscription });
    }

    const plan = userData.plan ?? "free";
    const hasDocPackage = userData.documentPackage?.purchased === true;

    const subscription: UserSubscription = {
      plan,
      stripeCustomerId: userData.stripeCustomerId,
      stripeSubscriptionId: userData.stripeSubscriptionId,
      standardSubscription: userData.standardSubscription,
      documentPackage: userData.documentPackage ?? { purchased: false },
      features: userData.features ?? getFeaturesByPlan(plan, hasDocPackage),
    };

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "サブスクリプション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
