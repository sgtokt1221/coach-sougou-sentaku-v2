/** 講師シフト（月別の勤務可能時間帯） */

export interface ShiftSlot {
  dayOfWeek: number;    // 0=日, 1=月, ..., 6=土
  startTime: string;    // "09:00"
  endTime: string;      // "09:30"
}

export interface TeacherShift {
  teacherId: string;
  month: string;         // "2026-04"
  slots: ShiftSlot[];
  submittedAt?: string;
  confirmedAt?: string;
  status: "pending" | "submitted" | "confirmed";
}

/** セッションマスタ（月別テンプレート） */
export interface SessionMaster {
  id: string;
  month: string;         // "2026-04"
  studentId: string;
  studentName: string;
  frequency: number;     // 月あたり回数
  preferredDay?: number; // 0-6（曜日）
  preferredTime?: string; // "14:00"
  teacherId?: string;
  teacherName?: string;
  type: "coaching" | "mock_interview" | "essay_review" | "general";
  duration?: number;     // 分
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
