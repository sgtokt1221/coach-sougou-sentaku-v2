import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PLANS = {
  self: { name: "AI自習プラン", priceId: null },
  coach: { name: "コーチプラン", priceId: process.env.STRIPE_COACH_PRICE_ID },
} as const;
