import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe/config";
import { adminDb } from "@/lib/firebase/admin";
import { getFeaturesByPlan } from "@/lib/stripe/plans";

export const runtime = "nodejs";

async function findUserByCustomerId(customerId: string) {
  if (!adminDb) return null;
  const snapshot = await adminDb
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function updateUserSubscription(
  userId: string,
  data: Record<string, unknown>
) {
  if (!adminDb) return;
  await adminDb.doc(`users/${userId}`).update({
    ...data,
    updatedAt: new Date(),
  });
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook署名またはシークレットが不足しています" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Webhook署名の検証に失敗しました" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    console.error("Firebase Admin SDK is not configured");
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId) break;

        const customerId = session.customer as string;

        if (plan === "standard") {
          // Subscription checkout completed
          const subscriptionId = session.subscription as string;
          const features = getFeaturesByPlan("standard", false);

          // Check if user already has document package
          const userDoc = await adminDb.doc(`users/${userId}`).get();
          const existingData = userDoc.data();
          const hasDocPackage = existingData?.documentPackage?.purchased === true;
          const finalFeatures = hasDocPackage
            ? getFeaturesByPlan("standard", true)
            : features;

          await updateUserSubscription(userId, {
            plan: "standard",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            standardSubscription: {
              status: "active",
              currentPeriodEnd: new Date(
                (session as Record<string, unknown> & { current_period_end?: number }).current_period_end
                  ? ((session as Record<string, unknown>).current_period_end as number) * 1000
                  : Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              cancelAtPeriodEnd: false,
            },
            features: finalFeatures,
          });
        } else if (plan === "document_package") {
          // One-time document package payment
          const paymentIntentId = session.payment_intent as string;

          // Get current user data to preserve existing subscription info
          const userDoc = await adminDb.doc(`users/${userId}`).get();
          const existingData = userDoc.data();
          const currentPlan = existingData?.plan ?? "free";
          const isStandard = currentPlan === "standard";
          const features = getFeaturesByPlan(
            isStandard ? "standard" : "free",
            true
          );

          await updateUserSubscription(userId, {
            stripeCustomerId: customerId,
            documentPackage: {
              purchased: true,
              purchasedAt: new Date().toISOString(),
              paymentIntentId,
            },
            features,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userDoc = await findUserByCustomerId(customerId);

        if (userDoc) {
          const subscriptionId = invoice.subscription as string;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const hasDocPackage = userDoc.data()?.documentPackage?.purchased === true;
            const features = getFeaturesByPlan("standard", hasDocPackage);

            await updateUserSubscription(userDoc.id, {
              standardSubscription: {
                status: "active",
                currentPeriodEnd: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
              features,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userDoc = await findUserByCustomerId(customerId);

        if (userDoc) {
          const existingData = userDoc.data();
          const hasDocPackage = existingData?.documentPackage?.purchased === true;
          // Keep document package features but mark subscription as past_due
          const features = getFeaturesByPlan("standard", hasDocPackage);

          await updateUserSubscription(userDoc.id, {
            standardSubscription: {
              ...existingData?.standardSubscription,
              status: "past_due",
            },
            features,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userDoc = await findUserByCustomerId(customerId);

        if (userDoc) {
          const existingData = userDoc.data();
          const hasDocPackage = existingData?.documentPackage?.purchased === true;
          const status = subscription.status as "active" | "past_due" | "canceled" | "unpaid" | "trialing";
          const isActive = ["active", "trialing"].includes(status);
          const features = getFeaturesByPlan(
            isActive ? "standard" : "free",
            hasDocPackage
          );

          await updateUserSubscription(userDoc.id, {
            plan: isActive ? "standard" : existingData?.plan,
            standardSubscription: {
              status,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            features,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userDoc = await findUserByCustomerId(customerId);

        if (userDoc) {
          const existingData = userDoc.data();
          const hasDocPackage = existingData?.documentPackage?.purchased === true;
          const features = getFeaturesByPlan("free", hasDocPackage);

          await updateUserSubscription(userDoc.id, {
            plan: "free",
            stripeSubscriptionId: null,
            standardSubscription: {
              status: "canceled",
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancelAtPeriodEnd: false,
            },
            features,
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhookの処理に失敗しました" },
      { status: 500 }
    );
  }
}
