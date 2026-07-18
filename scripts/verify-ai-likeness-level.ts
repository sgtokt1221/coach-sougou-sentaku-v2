/**
 * aiLikenessLevel の境界値を検証する簡易スクリプト。
 * 実行: npx tsx scripts/verify-ai-likeness-level.ts
 */
import { aiLikenessLevel, AI_LIKENESS_SUBMIT_THRESHOLD } from "../src/lib/types/document";

const cases: [number, "low" | "medium" | "high"][] = [
  [0, "low"],
  [39, "low"],
  [40, "medium"],
  [69, "medium"],
  [70, "high"],
  [100, "high"],
];

let failed = 0;
for (const [score, expected] of cases) {
  const actual = aiLikenessLevel(score);
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} score=${score} -> ${actual} (expected ${expected})`);
}

// 閾値 60 は medium 帯に入っていること（設計整合）
const thresholdLevel = aiLikenessLevel(AI_LIKENESS_SUBMIT_THRESHOLD);
const thresholdOk = thresholdLevel === "medium";
if (!thresholdOk) failed++;
console.log(
  `${thresholdOk ? "PASS" : "FAIL"} threshold=${AI_LIKENESS_SUBMIT_THRESHOLD} -> ${thresholdLevel} (expected medium)`
);

if (failed > 0) {
  console.error(`\n${failed} 件失敗`);
  process.exit(1);
}
console.log("\nすべてPASS");
