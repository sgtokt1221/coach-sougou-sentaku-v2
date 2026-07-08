// scripts/validate-logical-tour.ts
import { TOUR_STATIONS, tourHref } from "../src/lib/logical-tour/stations";
import {
  jstDayBoundsUtc, addDaysStr, computeStreakUpdate, nextIncompleteStation, remainingMinutes,
} from "../src/lib/logical-tour/logic";

let errors = 0;
const fail = (m: string) => { console.error(`[logical-tour] ${m}`); errors++; };

// 駅定義
const keys = new Set<string>();
for (const s of TOUR_STATIONS) {
  if (keys.has(s.key)) fail(`dup key ${s.key}`);
  keys.add(s.key);
  if (!s.href.startsWith("/student/")) fail(`bad href ${s.key}`);
  if (s.estMinutes <= 0) fail(`estMinutes ${s.key}`);
  if (tourHref(s.key) !== `${s.href}?tour=1`) fail(`tourHref ${s.key}`);
}
if (TOUR_STATIONS.length !== 3) fail(`stations=${TOUR_STATIONS.length}`);

// 日窓（JST）
const b = jstDayBoundsUtc("2026-07-08");
if (b.startIso !== "2026-07-07T15:00:00.000Z") fail(`startIso ${b.startIso}`); // JST00:00 = UTC前日15:00
if (b.endIso !== "2026-07-08T15:00:00.000Z") fail(`endIso ${b.endIso}`);
if (addDaysStr("2026-07-08", -1) !== "2026-07-07") fail("addDaysStr -1");
if (addDaysStr("2026-07-01", -1) !== "2026-06-30") fail("addDaysStr month boundary");

// ストリーク
const base = { lastCompletedDate: "2026-07-07", streak: 3, longestStreak: 5 };
let u = computeStreakUpdate(base, "2026-07-08", true);
if (!u || u.streak !== 4 || u.longestStreak !== 5 || u.lastCompletedDate !== "2026-07-08") fail("streak yesterday+1");
u = computeStreakUpdate({ lastCompletedDate: "2026-07-05", streak: 9, longestStreak: 9 }, "2026-07-08", true);
if (!u || u.streak !== 1 || u.longestStreak !== 9) fail("streak gap reset to 1");
if (computeStreakUpdate(base, "2026-07-07", true) !== null) fail("streak same day null"); // lastCompletedDate===today
if (computeStreakUpdate(base, "2026-07-08", false) !== null) fail("streak notAllDone null");
u = computeStreakUpdate({ lastCompletedDate: "2026-07-07", streak: 7, longestStreak: 5 }, "2026-07-08", true);
if (!u || u.longestStreak !== 8) fail("longest updates when streak exceeds");

// 次駅 / 残り分
if (nextIncompleteStation({ choco: true, summary: false, logic: false }) !== "summary") fail("next=summary");
if (nextIncompleteStation({ choco: true, summary: true, logic: true }) !== null) fail("next=null when all done");
if (remainingMinutes({ choco: true, summary: false, logic: false }) !== 25) fail("remaining=25");

if (errors > 0) { console.error(`\n${errors} 件のエラー`); process.exit(1); }
console.log("logical-tour OK");
