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
  /** 所属塾 ID。 organizations/{orgId} を参照。 全ロール共通フィールド */
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile extends UserProfile {
  role: "student";
  school?: string;
  /** 高校マスタ(highSchools)の ID。選択式入力で紐付く。自由入力時は未設定 */
  schoolId?: string;
  grade?: number;
  /** grade を最後に入力した日時 (ISO)。 4/1 経過で表示時に grade を自動加算するための基準点 */
  gradeUpdatedAt?: string;
  /** 浪人フラグ。 true なら grade 自動加算は停止し、 表示は「浪人」 固定 */
  isRonin?: boolean;
  gpa?: number;
  englishCerts?: EnglishCert[];
  activities?: string[];
  interests?: string[];
  targetUniversities?: string[];
  onboardingCompleted?: boolean;
  /** 進学先大学 ID（合格大学登録/退会時に確定）。高校→進学先 集計に使用 */
  enrolledUniversityId?: string;
  /** 進学先大学名（表示用） */
  enrolledUniversityName?: string;
  /** 進路（合格大学 or 進学しない理由）を登録済みか。卒業生催促の停止判定に使用 */
  graduationOutcomeRecorded?: boolean;
  /** 進学しない場合の理由（浪人/就職/未定 等）。enrolled が無い outcome */
  graduationOutcomeReason?: string;
  /** 退会日時 (ISO)。role:"disabled" と併用 */
  withdrawnAt?: string;
  /** 卒業生への進路催促を最後に送った日時 (ISO)。頻度制御用 */
  lastGraduationReminderAt?: string;
  managedBy?: string;
  /**
   * @deprecated 単一講師時代の名残。複数対応後は assignedTeacherIds を使う。
   * 後方互換のため getAssignedTeacherIds() で吸収する。
   */
  assignedTeacherId?: string;
  /**
   * 担当講師の uid 配列。managedBy(管理者)とは独立した「やりとりする講師」。
   * 1生徒を複数講師が担当できる。学習状況閲覧・生徒↔講師メッセージの宛先判定に使う。
   */
  assignedTeacherIds?: string[];
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
  /** 自己探究授業の受講登録フラグ。管理者が生徒詳細で付与する */
  researchEnrolled?: boolean;
  /** 探究受講を登録した日時 (ISO) */
  researchEnrolledAt?: string;
  /** 探究の受講ペース */
  researchPlan?: "weekly" | "monthly";
  /**
   * 録音・AI処理に関する保護者同意の状態。
   * none=未登録 / pending=登録済み同意待ち / granted=同意済み / revoked=撤回。
   * granted のときだけ録音・AI評価機能を解放する（同意ゲート）。
   */
  researchConsentStatus?: "none" | "pending" | "granted" | "revoked";
}

export interface EnglishCert {
  type: "EIKEN" | "TOEIC" | "TOEFL" | "IELTS" | "TEAP" | "GTEC" | "OTHER";
  score?: string;
  grade?: string;
  acquiredAt?: Date;
}
