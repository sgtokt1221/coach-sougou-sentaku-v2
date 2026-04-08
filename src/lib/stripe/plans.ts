import type { FeatureFlags, PricingPlan, SubscriptionPlan } from "@/lib/types/subscription";

export const STANDARD_PLAN = {
  priceId: process.env.STRIPE_STANDARD_PRICE_ID ?? null,
  price: 10000,
  interval: "month" as const,
};

export const DOCUMENT_PACKAGE = {
  priceId: process.env.STRIPE_DOCUMENT_PRICE_ID ?? null,
  price: 50000,
  oneTime: true,
};

export const FREE_FEATURES: FeatureFlags = {
  essayReview: false,
  interviewPractice: false,
  growthTracking: false,
  passedData: false,
  voiceAnalysis: false,
  documentEditor: false,
  activityManager: false,
  apOptimization: false,
};

export const STANDARD_FEATURES: FeatureFlags = {
  essayReview: true,
  interviewPractice: true,
  growthTracking: true,
  passedData: true,
  voiceAnalysis: true,
  documentEditor: false,
  activityManager: false,
  apOptimization: false,
};

export const DOCUMENT_PACKAGE_FEATURES: Partial<FeatureFlags> = {
  documentEditor: true,
  activityManager: true,
  apOptimization: true,
};

export function getFeaturesByPlan(
  plan: SubscriptionPlan,
  hasDocumentPackage: boolean
): FeatureFlags {
  let features: FeatureFlags;

  switch (plan) {
    case "standard":
      features = { ...STANDARD_FEATURES };
      break;
    case "free":
    default:
      features = { ...FREE_FEATURES };
      break;
  }

  if (hasDocumentPackage) {
    features = {
      ...features,
      ...DOCUMENT_PACKAGE_FEATURES,
    };
  }

  return features;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "standard",
    name: "Standard",
    nameJa: "スタンダード",
    price: 10000,
    currency: "jpy",
    interval: "month",
    popular: true,
    features: [
      "小論文AI添削（無制限）",
      "AI模擬面接（4モード）",
      "成長トラッキング",
      "合格者データ閲覧",
      "音声面接分析",
      "志望校マッチング",
      "弱点分析レポート",
    ],
  },
  {
    id: "document_package",
    name: "Document Package",
    nameJa: "出願書類パッケージ",
    price: 50000,
    currency: "jpy",
    oneTime: true,
    features: [
      "出願書類AIエディタ",
      "活動実績AIヒアリング",
      "AP別最適化表現生成",
      "書類バージョン管理",
      "活動実績の構造化",
      "大学別チェックリスト",
    ],
  },
];
