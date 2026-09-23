/**
 * ランクの元になる「直近の重み付き平均」の検査（AI も DB も使わない）。
 * 設計: docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md §3
 */
import assert from "node:assert/strict";
import {
  recentWeightedAverage,
  RANK_WINDOW_WEIGHT,
  type PracticeScore,
} from "../src/lib/rank/recent-average";

let checks = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

const s = (value: number, at: number, max = 50, weight = 1): PracticeScore => ({
  value,
  max,
  weight,
  at,
});

check("窓は重み10", () => assert.equal(RANK_WINDOW_WEIGHT, 10));

check("0件は null", () => {
  const r = recentWeightedAverage([], 50);
  assert.equal(r.avg, null);
  assert.equal(r.used, 0);
});

check("新しい順に重みの合計10までしか見ない", () => {
  // 古い5件は10点、新しい10件は30点
  const old = Array.from({ length: 5 }, (_, i) => s(10, i));
  const recent = Array.from({ length: 10 }, (_, i) => s(30, 100 + i));
  const r = recentWeightedAverage([...old, ...recent], 50);
  assert.equal(r.avg, 30);
  assert.equal(r.used, 10);
});

check("ちょこ添削は0.5件として数え、重み付きで平均する", () => {
  // 本添削8件(40点) + ちょこ4件(20点, 重み0.5) = 重み10
  const essays = Array.from({ length: 8 }, (_, i) => s(40, 100 + i));
  const chocos = Array.from({ length: 4 }, (_, i) => s(20, 200 + i, 50, 0.5));
  const r = recentWeightedAverage([...essays, ...chocos], 50);
  // (8*40 + 2*20) / 10 = 36
  assert.equal(r.avg, 36);
  assert.equal(r.used, 12);
});

check("窓をまたぐ1件は、残りの重みだけ入れる", () => {
  // 新しい順: 本添削9件(30点) → ちょこ(重み0.5, 50点) → 本添削(10点)
  // 9 + 0.5 = 9.5、残り0.5 を本添削(10点)から取る
  const items = [
    ...Array.from({ length: 9 }, (_, i) => s(30, 300 + i)),
    s(50, 200, 50, 0.5),
    s(10, 100),
  ];
  const r = recentWeightedAverage(items, 50);
  // (9*30 + 0.5*50 + 0.5*10) / 10 = 30
  assert.equal(r.avg, 30);
});

check("満点の違う記録は scaleMax に揃えてから平均する", () => {
  // 口頭試問型 48/60 → 40/50、通常 30/50
  const r = recentWeightedAverage([s(48, 2, 60), s(30, 1, 50)], 50);
  assert.equal(r.avg, 35);
});

check("面接: 40点満点を40点スケールのまま、50点満点は40点へ揃える", () => {
  const r = recentWeightedAverage([s(32, 2, 40), s(40, 1, 50)], 40);
  // 32/40 → 32、40/50 → 32
  assert.equal(r.avg, 32);
});

console.log(`verify-rank-average: ${checks} checks passed`);
