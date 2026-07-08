// src/lib/recurring-class/generate.ts
import type {
  GenSlot,
  GenPreviewItem,
  GenResult,
} from "@/lib/types/recurring-class";
import type { SessionType } from "@/lib/types/session";

/** "YYYY-MM" を {year, monthIndex(0-11)} に分解 */
function parseMonth(month: string): { y: number; mi: number } {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  return { y, mi: m - 1 };
}

/** 対象月の weekday(0-6) に該当する "YYYY-MM-DD" 一覧（昇順） */
export function datesForWeekdayInMonth(month: string, weekday: number): string[] {
  const { y, mi } = parseMonth(month);
  const last = new Date(y, mi + 1, 0).getDate(); // 当月末日
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, mi, d);
    if (dt.getDay() === weekday) {
      out.push(`${y}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return out;
}

/** 対象月の1つ前のカレンダー月 "YYYY-MM" */
export function previousMonth(month: string): string {
  const { y, mi } = parseMonth(month);
  const d = new Date(y, mi - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface SessionLike {
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  type?: SessionType;
  status?: string;
  scheduledAt?: string;
  duration?: number | null;
  format?: "online" | "offline";
}

/**
 * セッション群からスロットを抽出。
 * - cancelled(欠席) は除外
 * - 同一枠(studentId×weekday×startTime×type)は1つに集約
 */
export function extractSlots(sessions: SessionLike[]): GenSlot[] {
  const map = new Map<string, GenSlot>();
  for (const s of sessions) {
    if (!s.studentId || !s.teacherId || !s.type || !s.scheduledAt) continue;
    if (s.status === "cancelled") continue;
    const at = new Date(s.scheduledAt);
    if (Number.isNaN(at.getTime())) continue;
    const weekday = at.getDay();
    const startTime = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    const key = `${s.studentId}|${weekday}|${startTime}|${s.type}`;
    if (map.has(key)) continue;
    map.set(key, {
      studentId: s.studentId,
      studentName: s.studentName ?? "",
      teacherId: s.teacherId,
      teacherName: s.teacherName ?? "",
      type: s.type,
      weekday,
      startTime,
      duration: s.duration ?? null,
      format: s.format,
    });
  }
  return [...map.values()];
}

/**
 * 生成計算（純関数）。
 * closureDates: 休校日 "YYYY-MM-DD" 集合 / existingKeys: `${studentId}|${scheduledAt}` 集合
 */
export function computeGeneration(params: {
  slots: GenSlot[];
  month: string;
  closureDates: Set<string>;
  existingKeys: Set<string>;
}): GenResult {
  const { slots, month, closureDates } = params;
  const existing = new Set(params.existingKeys); // 実行内の重複も防ぐためコピーして追記
  const result: GenResult = { toCreate: [], skippedClosure: [], skippedDuplicate: [] };

  for (const slot of slots) {
    for (const date of datesForWeekdayInMonth(month, slot.weekday)) {
      const scheduledAt = `${date}T${slot.startTime}:00`;
      const item: GenPreviewItem = {
        studentId: slot.studentId,
        studentName: slot.studentName,
        teacherName: slot.teacherName,
        type: slot.type,
        scheduledAt,
        slot,
      };
      if (closureDates.has(date)) {
        result.skippedClosure.push(item);
        continue;
      }
      const key = `${slot.studentId}|${scheduledAt}`;
      if (existing.has(key)) {
        result.skippedDuplicate.push(item);
        continue;
      }
      existing.add(key);
      result.toCreate.push(item);
    }
  }
  // 見やすさのため scheduledAt 昇順
  const byAt = (a: GenPreviewItem, b: GenPreviewItem) => a.scheduledAt.localeCompare(b.scheduledAt);
  result.toCreate.sort(byAt);
  result.skippedClosure.sort(byAt);
  result.skippedDuplicate.sort(byAt);
  return result;
}
