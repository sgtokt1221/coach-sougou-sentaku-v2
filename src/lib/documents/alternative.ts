import { jstDayKey } from "@/lib/utils/activity-heatmap";
import type { AlternativeReason } from "@/lib/ai/prompts/statement";

/** 「別の案」を作れる回数（1書類・日本時間の1日あたり。2026-11-26 ユーザー決定） */
export const ALTERNATIVE_DAILY_LIMIT = 3;

/** 画面の札の名前（並びも画面の順） */
export const ALTERNATIVE_REASON_LABELS: Record<AlternativeReason, string> = {
  experience: "別の経験を軸に",
  angle: "切り口を変える",
  fresh: "全体を作り直す",
};

/** 今日あと何回作れるか。日付が変わっていれば上限まで戻る */
export function alternativeRemaining(
  usage: { date: string; count: number } | null | undefined,
  nowMs: number = Date.now()
): number {
  const used = usage && usage.date === jstDayKey(nowMs) ? usage.count : 0;
  return Math.max(0, ALTERNATIVE_DAILY_LIMIT - used);
}
