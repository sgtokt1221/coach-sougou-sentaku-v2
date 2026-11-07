/**
 * 合格者ラインの純関数の確認（Firestore も AI も使わない）。
 *   npx tsx scripts/verify-passer-benchmark.ts
 */
import {
  benchmarkAt,
  combinePassers,
  median,
  monthsSince,
  passerColumnsAt,
  summarizePasser,
  TIER_OF_GROUP,
} from "../src/lib/benchmark/passer-benchmark";

const DAY = 24 * 60 * 60 * 1000;
let failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "OK " : "NG "} ${name}${ok ? "" : `: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`}`);
}

const t0 = Date.UTC(2026, 6, 29);
eq("monthsSince 0日", monthsSince(t0, t0), 0);
eq("monthsSince 29日", monthsSince(t0, t0 + 29 * DAY), 0);
eq("monthsSince 30日", monthsSince(t0, t0 + 30 * DAY), 1);
eq("monthsSince 前の日付は0", monthsSince(t0, t0 - DAY), 0);

eq("median 奇数", median([3, 1, 2]), 2);
eq("median 偶数", median([1, 2, 3, 4]), 2.5);

const b = { level: 30, trajectory: [{ month: 0, score: 22 }, { month: 2, score: 28 }] };
eq("benchmarkAt 0か月", benchmarkAt(b, 0), 22);
eq("benchmarkAt 間の月は前の月", benchmarkAt(b, 1), 22);
eq("benchmarkAt 最後の月", benchmarkAt(b, 2), 28);
eq("benchmarkAt 最後より後は水準", benchmarkAt(b, 5), 30);
eq("benchmarkAt 推移なし", benchmarkAt({ level: 27, trajectory: [] }, 3), 27);

const pts = [
  { at: t0, score: 20 },
  { at: t0 + 5 * DAY, score: 24 },
  { at: t0 + 40 * DAY, score: 28 },
  { at: t0 + 45 * DAY, score: 30 },
  { at: t0 + 50 * DAY, score: 26 },
];
const s = summarizePasser(pts)!;
eq("summarize 月ごと", s.monthly, [{ month: 0, score: 22 }, { month: 1, score: 28 }]);
eq("summarize 直近10件の中央値", s.recentMedian, 26);
const twelve = Array.from({ length: 12 }, (_, i) => ({ at: t0 + i * DAY, score: i < 2 ? 0 : 30 }));
eq("summarize 直近10件だけを見る", summarizePasser(twelve)!.recentMedian, 30);
eq("summarize 空", summarizePasser([]), null);

const c = combinePassers([
  { recentMedian: 26, monthly: [{ month: 0, score: 22 }, { month: 1, score: 28 }] },
  { recentMedian: 29, monthly: [{ month: 0, score: 25 }] },
])!;
eq("combine 水準は平均を丸める", c.level, 28);
eq("combine 月ごとの平均", c.trajectory, [{ month: 0, score: 24 }, { month: 1, score: 28 }]);
eq("combine 人数", c.passerCount, 2);
eq("combine 空", combinePassers([]), null);

eq("段 産近甲龍", TIER_OF_GROUP.sankinkohryu, "mid");
eq("段 関関同立", TIER_OF_GROUP.kankandouritsu, "upper");
eq("段 MARCH", TIER_OF_GROUP.march, "upper");
eq("段 旧帝大", TIER_OF_GROUP.kyutei, "top");
eq("段 対象外の群", TIER_OF_GROUP.seiseimeidoku, undefined);

const views = [
  { tier: "mid" as const, label: "", level: 30, trajectory: [{ month: 0, score: 22 }], startAt: t0 },
  { tier: "upper" as const, label: "", level: 36, trajectory: [{ month: 0, score: 28 }], startAt: t0 },
];
eq("列 段ごとに同じ時期の点", passerColumnsAt(views, t0), { passer_mid: 22, passer_upper: 28 });
eq("列 推移より後は水準", passerColumnsAt(views, t0 + 60 * DAY), { passer_mid: 30, passer_upper: 36 });
eq("列 時刻なし", passerColumnsAt(views, undefined), {});
eq("列 書き始めが不明", passerColumnsAt([{ ...views[0], startAt: null }], t0), {});
eq("列 ラインなし", passerColumnsAt(null, t0), {});

if (failed) {
  console.error(`\n${failed} 件失敗`);
  process.exit(1);
}
console.log("\nすべて OK");
