// src/lib/logic-drill/rotation.ts
import { LOGIC_DRILL_TYPES, type LogicDrillType } from "@/lib/types/logic-drill";
import {
  getLogicDrillItemsByType,
  ALL_LOGIC_DRILL_ITEMS,
} from "@/data/logic-drills";
import type { LogicDrillItem } from "@/lib/types/logic-drill";

/** "YYYY-MM-DD" → 1970-01-01 からの通日数。パース不能時は 0。 */
function dayNumber(dateStr: string): number {
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor(t / 86_400_000);
}

/** その日の型（通日 mod 型数）。 */
export function getRotatedLogicDrillType(dateStr: string): LogicDrillType {
  const n = dayNumber(dateStr);
  return LOGIC_DRILL_TYPES[n % LOGIC_DRILL_TYPES.length];
}

/** 指定型の中から、その日の1問を決定的に選ぶ（通日でバンクを巡回）。 */
export function pickLogicDrillItem(
  type: LogicDrillType,
  dateStr: string,
): LogicDrillItem | null {
  const items = getLogicDrillItemsByType(type);
  if (items.length === 0) return null;
  const n = dayNumber(dateStr);
  return items[n % items.length];
}

/** id から1問取得（評価API・結果再表示用）。 */
export function getLogicDrillItemById(id: string): LogicDrillItem | null {
  return ALL_LOGIC_DRILL_ITEMS.find((it) => it.id === id) ?? null;
}
