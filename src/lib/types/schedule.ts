export interface TimeSlot {
  dayOfWeek: number; // 0=日, 1=月, ..., 6=土
  startTime: string; // "09:00"
  endTime: string; // "09:30"
}

export interface TeacherAvailability {
  teacherId: string;
  teacherName: string;
  slots: TimeSlot[];
}

export interface StudentPreference {
  studentId: string;
  studentName: string;
  slots: TimeSlot[];
}

export interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
}
