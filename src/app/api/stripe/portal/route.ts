import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
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
    const { userId } = await request.json();

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const userDoc = await adminDb.doc(`users/${userId}`).get();
    const stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripeカスタマーが見つかりません" },
        { status: 404 }
      );
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/admin/students/${userId}`,
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
