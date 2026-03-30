export type UserRole = "student" | "teacher" | "admin" | "superadmin";

export type PlanType = "free" | "pro";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  plan?: PlanType;
  stripeCustomerId?: string;
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
  mbtiType?: string;
  selfAnalysisId?: string;
}

export interface EnglishCert {
  type: "EIKEN" | "TOEIC" | "TOEFL" | "IELTS" | "TEAP" | "GTEC" | "OTHER";
  score?: string;
  grade?: string;
  acquiredAt?: Date;
}
