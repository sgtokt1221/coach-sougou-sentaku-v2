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
