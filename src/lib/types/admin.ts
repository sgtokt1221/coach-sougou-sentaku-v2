import type { WeaknessRecord } from "./growth";
import type { EssayScores } from "./essay";
import type { EnglishCert } from "./user";

export interface StudentListItem {
  uid: string;
  displayName: string;
  email: string;
  targetUniversities: string[];
  latestScore: number | null;
  essayCount: number;
  lastActivityAt: string | null;
  alertFlags: ("inactive" | "repeated_weakness" | "declining")[];
  managedBy?: string;
  plan?: "self" | "coach";
  scoreTrend: "up" | "down" | "flat" | null;
  activeWeaknessCount: number;
  documentProgress: { completed: number; total: number };
  lastSessionAt: string | null;
}

export interface StudentDetail {
  profile: {
    uid: string;
    displayName: string;
    email: string;
    school?: string;
    grade?: number;
    gpa?: number;
    englishCerts?: EnglishCert[];
    targetUniversities: string[];
  };
  weaknesses: WeaknessRecord[];
  essays: EssayListItem[];
  scoreTrend: ScoreTrendPoint[];
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
  type: "inactive" | "declining" | "repeated_weakness" | "document_deadline";
  severity: "critical" | "warning" | "high";
  message: string;
  detectedAt: string;
  acknowledged: boolean;
}
