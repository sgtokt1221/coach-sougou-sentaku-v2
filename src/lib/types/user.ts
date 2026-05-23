import type {
  SubscriptionPlan,
  StandardSubscription,
  DocumentPackage,
  FeatureFlags,
} from "@/lib/types/subscription";
import type { AcademicCategory, SkillRank } from "@/lib/types/skill-check";

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
  /** 月あたりのセッション回数（デフォルト1） */
  sessionsPerMonth?: number;
  /** @deprecated 旧 GD 専用 60 日制限の名残。新規コードは lastRealtimeAt を使用 */
  lastRealtimeGdAt?: Date;
  /** 最後に Realtime API で音声面接 (全モード) を実行した日時。7 日に 1 回の制限判定用 */
  lastRealtimeAt?: Date;
  /** スキルチェックを一度でも完了したか */
  skillCheckCompleted?: boolean;
  /** 最後にスキルチェックを受けた日時。30日経過でリマインド表示 */
  lastSkillCheckedAt?: Date;
  /**
   * 現在の総合スキルランク (デノーマライズ、一覧・ダッシュボード表示用)。
   * SC 原値そのものではなく **aggregate 後の合成ランク** (SC × 0.7 + 直近30日練習 × 0.3)。
   * essay/review や interview/end でも更新される。
   */
  currentSkillRank?: SkillRank;
  /** 現在の総合スキルスコア 0-50 (aggregate 後合成スコア、デノーマライズ) */
  currentSkillScore?: number;
  /**
   * SC を受験した時点の原値 (aggregate 計算の入力として保持)。
   * 普段の添削/面接完了時に aggregate を再計算する際に、この値を SC 入力として使う。
   * 未設定の旧データは currentSkillScore を SC 原値とみなす (後方互換)。
   */
  lastSkillCheckScore?: number;
  lastSkillCheckRank?: SkillRank;
  /** 受験する系統（志望学部から自動導出→生徒・管理者が変更可） */
  academicCategory?: AcademicCategory;
  /** 面接スキルチェックを一度でも完了したか */
  interviewSkillCheckCompleted?: boolean;
  /** 最後に面接スキルチェックを受けた日時 */
  lastInterviewCheckedAt?: Date;
  /** 現在の面接スキルランク (aggregate 後合成、面接 SC × 0.7 + 直近30日練習 × 0.3) */
  currentInterviewRank?: SkillRank;
  /** 現在の面接スキルスコア 0-40 (aggregate 後合成) */
  currentInterviewScore?: number;
  /** 面接 SC を受験した時点の原値 (aggregate 計算の入力) */
  lastInterviewCheckScore?: number;
  lastInterviewCheckRank?: SkillRank;
}

export interface EnglishCert {
  type: "EIKEN" | "TOEIC" | "TOEFL" | "IELTS" | "TEAP" | "GTEC" | "OTHER";
  score?: string;
  grade?: string;
  acquiredAt?: Date;
}
