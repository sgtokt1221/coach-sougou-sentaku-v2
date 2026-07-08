// src/lib/logical-tour/logic.ts
import { TOUR_STATIONS } from "@/lib/logical-tour/stations";
import type { LogicalTourState, TourStationKey } from "@/lib/types/logical-tour";

/** JST の当日 [start, end) を UTC ISO 文字列で返す。 */
export function jstDayBoundsUtc(dateStr: string): { startIso: string; endIso: string } {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** "YYYY-MM-DD" に days を加えた日付文字列（UTC基準で桁上げ）。 */
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 3駅完了日のストリーク更新値。更新不要なら null（＝未完 or 既に今日カウント済み）。
 * yesterday 連続で +1、途切れは 1、longestStreak は最大を維持。
 */
export function computeStreakUpdate(
  prev: LogicalTourState,
  today: string,
  allDone: boolean,
): LogicalTourState | null {
  if (!allDone) return null;
  if (prev.lastCompletedDate === today) return null;
  const yesterday = addDaysStr(today, -1);
  const streak = prev.lastCompletedDate === yesterday ? (prev.streak ?? 0) + 1 : 1;
  const longestStreak = Math.max(prev.longestStreak ?? 0, streak);
  return { lastCompletedDate: today, streak, longestStreak };
}

/** 未完了の最初の駅key（順路順）。全完なら null。 */
export function nextIncompleteStation(
  doneByKey: Record<TourStationKey, boolean>,
): TourStationKey | null {
  for (const s of [...TOUR_STATIONS].sort((a, b) => a.order - b.order)) {
    if (!doneByKey[s.key]) return s.key;
  }
  return null;
}

/** 未完了駅の estMinutes 合計。 */
export function remainingMinutes(doneByKey: Record<TourStationKey, boolean>): number {
  return TOUR_STATIONS.filter((s) => !doneByKey[s.key]).reduce((n, s) => n + s.estMinutes, 0);
}
