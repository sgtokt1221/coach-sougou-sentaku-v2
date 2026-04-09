export type SubscriptionPlan = "free" | "standard" | "document_package";

export interface FeatureFlags {
  essayReview: boolean;
  interviewPractice: boolean;
  growthTracking: boolean;
  passedData: boolean;
  voiceAnalysis: boolean;
  documentEditor: boolean;
  activityManager: boolean;
  apOptimization: boolean;
}

export interface StandardSubscription {
  status: "active" | "past_due" | "canceled" | "unpaid" | "trialing";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface DocumentPackage {
  purchased: boolean;
  purchasedAt?: string;
  paymentIntentId?: string;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  standardSubscription?: StandardSubscription;
  documentPackage: DocumentPackage;
  features: FeatureFlags;
}

export interface PricingPlan {
  id: string;
  name: string;
  nameJa: string;
  price: number;
  currency: string;
  interval?: "month" | "year";
  features: string[];
  popular?: boolean;
  oneTime?: boolean;
}
