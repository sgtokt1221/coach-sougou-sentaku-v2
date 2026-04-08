import { NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe/config";
import { STANDARD_PLAN, DOCUMENT_PACKAGE } from "@/lib/stripe/plans";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const auth = await requireRole(request, [
    "admin",
    "superadmin",
    "teacher",
    "student",
  ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { plan } = await request.json();

    if (plan !== "standard" && plan !== "document_package") {
      return NextResponse.json(
        { error: "無効なプランです。standard または document_package を指定してください" },
        { status: 400 }
      );
    }

    if (!isStripeConfigured() || !stripe) {
      // Dev mode: return mock checkout URL
      return NextResponse.json({
        url: null,
        devMode: true,
        message: "Stripe未設定のため、開発モードで動作しています",
      });
    }

    const userId = auth.uid;

    // Get user email and existing Stripe customer ID
    let customerEmail: string | undefined;
    let stripeCustomerId: string | undefined;
    if (adminDb) {
      const userDoc = await adminDb.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      customerEmail = userData?.email;
      stripeCustomerId = userData?.stripeCustomerId;
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    if (plan === "standard") {
      const priceId = STANDARD_PLAN.priceId;
      if (!priceId) {
        return NextResponse.json(
          { error: "スタンダードプランの価格IDが設定されていません (STRIPE_STANDARD_PRICE_ID)" },
          { status: 500 }
        );
      }

      const sessionParams: Record<string, unknown> = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/student/pricing?checkout=success&plan=standard`,
        cancel_url: `${origin}/student/pricing?checkout=cancel`,
        metadata: { userId, plan: "standard" },
      };

      if (stripeCustomerId) {
        sessionParams.customer = stripeCustomerId;
      } else {
        sessionParams.customer_email = customerEmail;
      }

      const session = await stripe.checkout.sessions.create(
        sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
      );
      return NextResponse.json({ url: session.url });
    }

    // document_package: one-time payment
    const priceId = DOCUMENT_PACKAGE.priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "出願書類パッケージの価格IDが設定されていません (STRIPE_DOCUMENT_PRICE_ID)" },
        { status: 500 }
      );
    }

    const sessionParams: Record<string, unknown> = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/student/pricing?checkout=success&plan=document_package`,
      cancel_url: `${origin}/student/pricing?checkout=cancel`,
      metadata: { userId, plan: "document_package" },
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "チェックアウトセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
