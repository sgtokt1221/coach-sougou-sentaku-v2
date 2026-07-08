// scripts/validate-recurring-class.ts
import {
  datesForWeekdayInMonth,
  previousMonth,
  extractSlots,
  computeGeneration,
} from "../src/lib/recurring-class/generate";

let errors = 0;
const fail = (m: string) => { console.error(`[recurring-class] ${m}`); errors++; };
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${msg}: got ${JSON.stringify(a)}`);
};

// 2026-07 の水曜(3): 1,8,15,22,29
eq(datesForWeekdayInMonth("2026-07", 3),
  ["2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29"], "水曜列挙");
eq(previousMonth("2026-07"), "2026-06", "前月");
eq(previousMonth("2026-01"), "2025-12", "前月(年跨ぎ)");

// スロット抽出: cancelled除外 + 集約
const slots = extractSlots([
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "completed", scheduledAt: "2026-06-03T19:00:00" },
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "scheduled", scheduledAt: "2026-06-10T19:00:00" }, // 同枠→集約
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "cancelled", scheduledAt: "2026-06-17T19:00:00" }, // 除外
]);
if (slots.length !== 1) fail(`slot集約 expected 1 got ${slots.length}`);
if (slots[0]?.weekday !== 3 || slots[0]?.startTime !== "19:00") fail("slot weekday/startTime");

// 生成: 休校日と重複をスキップ
const res = computeGeneration({
  slots,
  month: "2026-07",
  closureDates: new Set(["2026-07-15"]), // 15日休校
  existingKeys: new Set(["s1|2026-07-08T19:00:00"]), // 8日は既存
});
// 水曜: 1,8,15,22,29 → 15休校 / 8重複 → 作成は 1,22,29 の3件
if (res.toCreate.length !== 3) fail(`toCreate expected 3 got ${res.toCreate.length}`);
if (res.skippedClosure.length !== 1) fail(`skippedClosure expected 1 got ${res.skippedClosure.length}`);
if (res.skippedDuplicate.length !== 1) fail(`skippedDuplicate expected 1 got ${res.skippedDuplicate.length}`);
if (res.toCreate[0].scheduledAt !== "2026-07-01T19:00:00") fail("toCreate順序");

if (errors > 0) { console.error(`\n${errors} 件のエラー`); process.exit(1); }
console.log("recurring-class OK");
