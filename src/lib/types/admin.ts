import type { WeaknessRecord } from "./growth";
import type { EssayScores } from "./essay";
import type { EnglishCert } from "./user";
import type { SkillRank, AcademicCategory, SkillCheckStatus } from "./skill-check";

export interface StudentListItem {
  uid: string;
  displayName: string;
  email: string;
  targetUniversities: string[];
  /** 学年 (高 1=1, 2=2, 3=3)、 fiscalYear 加算前の生値 */
  grade?: number;
  /** grade 入力日時 (ISO)。 卒業生判定 + 「現役に戻す」 ボタンの表示用 */
  gradeUpdatedAt?: string;
  /** 浪人フラグ */
  isRonin?: boolean;
  /** 所属塾 ID */
  organizationId?: string;
  latestScore: number | null;
  essayCount: number;
  lastActivityAt: string | null;
  alertFlags: ("inactive" | "repeated_weakness" | "declining" | "document_deadline" | "ap_struggle" | "weakness_stuck" | "deadline_risk" | "score_plateau")[];
  managedBy?: string;
  plan?: "self" | "coach";
  scoreTrend: "up" | "down" | "flat" | null;
  activeWeaknessCount: number;
  documentProgress: { completed: number; total: number };
  lastSessionAt: string | null;
  /** スキルチェック総合ランク（未受験 null） */
  currentSkillRank: SkillRank | null;
  /** スキルチェック総合スコア 0-50 */
  currentSkillScore: number | null;
  /** 最後に受験した日時 */
  lastSkillCheckedAt: string | null;
  /** 受験系統 */
  academicCategory: AcademicCategory | null;
  /** 面接スキルランク */
  currentInterviewRank: SkillRank | null;
  /** 面接スキルスコア 0-40 */
  currentInterviewScore: number | null;
  /** 最後に面接スキルチェックを受けた日時 */
  lastInterviewCheckedAt: string | null;
}

export interface StudentDetail {
  profile: {
    uid: string;
    displayName: string;
    email: string;
    school?: string;
    grade?: number;
    /** grade 入力日時 (ISO)。 表示時の自動加算基準 */
    gradeUpdatedAt?: string;
    /** 浪人フラグ */
    isRonin?: boolean;
    /** 所属塾 ID */
    organizationId?: string;
    gpa?: number;
    englishCerts?: EnglishCert[];
    targetUniversities: string[];
    resolvedUniversities?: { compoundId: string; universityName: string; facultyName: string }[];
  };
  weaknesses: WeaknessRecord[];
  essays: EssayListItem[];
  /** @deprecated Use essayScoreTrend + interviewScoreTrend */
  scoreTrend?: ScoreTrendPoint[];
  essayScoreTrend?: { date: string; total: number }[];
  interviewScoreTrend?: { date: string; total: number }[];
  /** 直近 essays の 5 軸平均 (0-10)。スキル俯瞰レーダー用 */
  essayCategoryAverages?: {
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    originality: number;
  };
  /** 直近 interviews (個人面接モード) の 5 軸平均 (0-10)。スキル俯瞰レーダー用 */
  interviewCategoryAverages?: {
    clarity: number;
    apAlignment: number;
    enthusiasm: number;
    specificity: number;
    bodyLanguage: number;
  };
  /** スキル俯瞰用 essay 統計サマリ (StatsSummaryCard と同じ shape) */
  essayStatsSummary?: {
    count: number;
    avgScore: number;
    scoreChange: number;
    bestCategory?: string;
    worstCategory?: string;
  };
  /** スキル俯瞰用 interview 統計サマリ */
  interviewStatsSummary?: {
    count: number;
    avgScore: number;
    scoreChange: number;
    bestCategory?: string;
    worstCategory?: string;
  };
  /** 小論文スキル: 最新スキルチェック結果のみ (sc_only / none モード) */
  essayAggregate?: import("@/lib/skill-check/aggregate").AggregateBreakdown;
  /** 面接スキル: 最新スキルチェック結果のみ */
  interviewAggregate?: import("@/lib/skill-check/aggregate").AggregateBreakdown;
  /** 小論文 SC 受験メタ。 リマインド表示用 */
  essaySkillCheckMeta?: {
    takenAt: string;
    daysSinceLast: number;
    needsRefresh: boolean;
  };
  /** 面接 SC 受験メタ */
  interviewSkillCheckMeta?: {
    takenAt: string;
    daysSinceLast: number;
    needsRefresh: boolean;
  };
  lastActivityAt?: string | null;
  realtimeUnlocked?: boolean;
  skillCheck?: SkillCheckStatus;
  interviewSkillCheck?: import("./interview-skill-check").InterviewSkillCheckStatus;
}

export interface EssayListItem {
  id: string;
  targetUniversity: string;
  targetFaculty: string;
  topic?: string;
  submittedAt: string;
  scores: EssayScores | null;
  status: string;
}

export interface ScoreTrendPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}

export interface AdminListItem {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "teacher";
  studentCount: number;
  createdAt: string;
}

export interface AdminPerformance {
  uid: string;
  displayName: string;
  role: "admin" | "teacher";
  studentCount: number;
  averageScore: number | null;
  alertStudentCount: number;
}

export interface RecentActivity {
  id: string;
  type: "essay_submit" | "interview_complete" | "student_added" | "student_assigned";
  description: string;
  timestamp: string;
  studentName?: string;
  adminName?: string;
}

export interface ScoreTrendItem {
  date: string;
  averageScore: number;
  count: number;
}

export interface InvitationSummary {
  total: number;
  pending: number;
  used: number;
  expired: number;
}

export interface SuperadminDashboardStats {
  totalAdmins: number;
  totalTeachers: number;
  totalStudents: number;
  unassignedStudents: number;
  adminPerformance: AdminPerformance[];
  recentActivity: RecentActivity[];
  scoreTrend: ScoreTrendItem[];
  invitationSummary: InvitationSummary;
}

export interface TeacherListItem {
  uid: string;
  displayName: string;
  email: string;
  studentCount: number;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalStudents: number;
  weeklyEssayCount: number;
  averageScore: number;
  alertStudentCount: number;
}

export interface AlertItem {
  id: string;
  studentUid: string;
  studentName: string;
  type:
    | "inactive"
    | "declining"
    | "repeated_weakness"
    | "document_deadline"
    | "ap_struggle"
    | "weakness_stuck"
    | "deadline_risk"
    | "score_plateau";
  severity: "critical" | "warning" | "high";
  message: string;
  detectedAt: string;
  acknowledged: boolean;
  recommendedAction?: string;
}
