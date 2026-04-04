import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe/config";
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
    const { userId, planId } = await request.json();

    if (planId !== "coach") {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    const priceId = PLANS.coach.priceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripeの価格IDが設定されていません" },
        { status: 500 }
      );
    }

    // ユーザーのメールアドレスを取得
    let customerEmail: string | undefined;
    if (adminDb) {
      const userDoc = await adminDb.doc(`users/${userId}`).get();
      customerEmail = userDoc.data()?.email;
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin/students/${userId}?checkout=success`,
      cancel_url: `${origin}/admin/students/${userId}?checkout=cancel`,
      customer_email: customerEmail,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "チェックアウトセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
