import type {
  SubscriptionPlan,
  StandardSubscription,
  DocumentPackage,
  FeatureFlags,
} from "@/lib/types/subscription";

export type UserRole = "student" | "teacher" | "admin" | "superadmin";

export type PlanType = "self" | "coach" | "free" | "standard";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  plan?: PlanType;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  standardSubscription?: StandardSubscription;
  documentPackage?: DocumentPackage;
  features?: FeatureFlags;
  subscriptionPlan?: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile extends UserProfile {
  role: "student";
  school?: string;
  grade?: number;
  gpa?: number;
  englishCerts?: EnglishCert[];
  activities?: string[];
  interests?: string[];
  targetUniversities?: string[];
  onboardingCompleted?: boolean;
  managedBy?: string;
  selfAnalysisId?: string;
}

export interface EnglishCert {
  type: "EIKEN" | "TOEIC" | "TOEFL" | "IELTS" | "TEAP" | "GTEC" | "OTHER";
  score?: string;
  grade?: string;
  acquiredAt?: Date;
}
