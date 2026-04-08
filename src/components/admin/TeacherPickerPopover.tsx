"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Teacher {
  uid: string;
  displayName: string;
  studentCount: number;
}

interface AvailableSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface TeacherPickerPopoverProps {
  teachers: Teacher[];
  availabilities: Map<string, AvailableSlot[]>; // teacherId → slots
  targetDayOfWeek: number; // 0=Sun, 1=Mon, ...
  targetTime: string; // "15:00"
  onSelect: (teacherId: string, teacherName: string) => void;
  children: React.ReactNode; // trigger element
}

/**
 * 指定時間帯に対応可能な講師選択ポップオーバー
 * シフト情報を基に利用可能な講師をフィルタリング
 */
export default function TeacherPickerPopover({
  teachers,
  availabilities,
  targetDayOfWeek,
  targetTime,
  onSelect,
  children
}: TeacherPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 時間文字列をminutes形式に変換（比較用）
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 講師が指定時間に対応可能かチェック
  const isTeacherAvailable = (teacherId: string): boolean => {
    const slots = availabilities.get(teacherId) || [];
    const targetMinutes = timeToMinutes(targetTime);

    return slots.some(slot => {
      if (slot.dayOfWeek !== targetDayOfWeek) return false;

      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);

      return targetMinutes >= startMinutes && targetMinutes < endMinutes;
    });
  };

  // 講師を利用可能・利用不可能に分類してソート
  const categorizedTeachers = teachers.reduce((acc, teacher) => {
    if (isTeacherAvailable(teacher.uid)) {
      acc.available.push(teacher);
    } else {
      acc.unavailable.push(teacher);
    }
    return acc;
  }, { available: [] as Teacher[], unavailable: [] as Teacher[] });

  // 担当生徒数でソート（少ない順）
  categorizedTeachers.available.sort((a, b) => a.studentCount - b.studentCount);
  categorizedTeachers.unavailable.sort((a, b) => a.studentCount - b.studentCount);

  const handleTeacherSelect = (teacher: Teacher) => {
    onSelect(teacher.uid, teacher.displayName);
    setIsOpen(false);
  };

  const formatDayOfWeek = (dayOfWeek: number): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayOfWeek];
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          <div className="space-y-2 mb-4">
            <h3 className="font-semibold text-sm">講師を選択</h3>
            <p className="text-xs text-muted-foreground">
              {formatDayOfWeek(targetDayOfWeek)}曜日 {targetTime} の対応可能講師
            </p>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {/* 対応可能講師 */}
            {categorizedTeachers.available.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  対応可能 ({categorizedTeachers.available.length}名)
                </div>
                {categorizedTeachers.available.map((teacher) => (
                  <div
                    key={teacher.uid}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleTeacherSelect(teacher)}
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{teacher.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        担当: {teacher.studentCount}名
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* 対応不可能講師 */}
            {categorizedTeachers.unavailable.length > 0 && (
              <>
                {categorizedTeachers.available.length > 0 && (
                  <div className="border-t my-2"></div>
                )}
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  シフト外 ({categorizedTeachers.unavailable.length}名)
                </div>
                {categorizedTeachers.unavailable.map((teacher) => (
                  <div
                    key={teacher.uid}
                    className="flex items-center gap-2 p-2 rounded-md opacity-50 cursor-not-allowed"
                  >
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{teacher.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        担当: {teacher.studentCount}名 (シフト外)
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* 講師がいない場合 */}
            {teachers.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                講師が見つかりません
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}