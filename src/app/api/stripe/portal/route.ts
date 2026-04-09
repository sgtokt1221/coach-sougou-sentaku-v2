import { NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe/config";
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
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json({
        url: null,
        devMode: true,
        message: "Stripe未設定のため、開発モードで動作しています",
      });
    }

    const userId = auth.uid;

    // Allow admin/teacher to manage a student's portal by passing userId
    let targetUserId = userId;
    try {
      const body = await request.json();
      if (body.userId && auth.role !== "student") {
        targetUserId = body.userId;
      }
    } catch {
      // No body provided, use authenticated user's own ID
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const userDoc = await adminDb.doc(`users/${targetUserId}`).get();
    const stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripeの顧客情報が見つかりません。まずプランを購入してください。" },
        { status: 404 }
      );
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const returnUrl =
      auth.role === "student"
        ? `${origin}/student/pricing`
        : `${origin}/admin/students/${targetUserId}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal session creation failed:", error);
    return NextResponse.json(
      { error: "ポータルセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
