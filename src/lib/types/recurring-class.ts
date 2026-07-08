// src/lib/types/recurring-class.ts
import type { SessionType } from "@/lib/types/session";

/** 1:1 定期授業テンプレ。Firestore: recurringClassTemplates/{id} */
export interface RecurringClassTemplate {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  type: SessionType; // 1:1系のみ（group_review不可）
  weekday: number; // 0=日 .. 6=土
  startTime: string; // "HH:MM"
  duration?: number | null;
  format?: "online" | "offline";
  active: boolean;
  createdByAdminId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 休校日。Firestore: closureDays/{id}（組織別） */
export interface ClosureDay {
  id: string;
  organizationId: string;
  date: string; // "YYYY-MM-DD"
  note?: string;
  createdByAdminId: string;
  createdAt: string;
}

/** 生成の元になるスロット */
export interface GenSlot {
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  type: SessionType;
  weekday: number;
  startTime: string;
  duration?: number | null;
  format?: "online" | "offline";
}

export interface GenPreviewItem {
  studentId: string;
  studentName: string;
  teacherName: string;
  type: SessionType;
  scheduledAt: string; // `${date}T${startTime}:00`
  slot: GenSlot;
}

export interface GenResult {
  toCreate: GenPreviewItem[];
  skippedClosure: GenPreviewItem[];
  skippedDuplicate: GenPreviewItem[];
}

/** 1:1 の種別（group_review を除く） */
export const ONE_ON_ONE_TYPES: SessionType[] = [
  "coaching",
  "mock_interview",
  "essay_review",
  "general",
];
