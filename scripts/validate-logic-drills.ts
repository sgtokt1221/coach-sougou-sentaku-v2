// scripts/validate-logic-drills.ts
import {
  ALL_LOGIC_DRILL_ITEMS,
  getLogicDrillItemsByType,
} from "../src/data/logic-drills";
import {
  FLAW_KIND_LABELS,
  LOGIC_DRILL_TYPES,
  type FlawKind,
} from "../src/lib/types/logic-drill";
import { getRotatedLogicDrillType, pickLogicDrillItem } from "../src/lib/logic-drill/rotation";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[logic-drills] ${msg}`);
  errors++;
};

// 1) id 重複なし
const seen = new Set<string>();
for (const it of ALL_LOGIC_DRILL_ITEMS) {
  if (seen.has(it.id)) fail(`dup id: ${it.id}`);
  seen.add(it.id);
  if (!it.prompt || it.prompt.length < 10) fail(`short prompt: ${it.id}`);
}

// 2) 全8型が10問以上
for (const type of LOGIC_DRILL_TYPES) {
  const n = getLogicDrillItemsByType(type).length;
  if (n < 10) fail(`type ${type} has ${n} items (need >=10)`);
}

// 2b) alexandra: choices 4つ・answerIndex 0-3・explanation 非空
for (const it of getLogicDrillItemsByType("alexandra")) {
  if (it.type !== "alexandra") continue;
  if (it.choices.length !== 4) fail(`alexandra needs 4 choices: ${it.id}`);
  if (!Number.isInteger(it.answerIndex) || it.answerIndex < 0 || it.answerIndex >= 4)
    fail(`alexandra answerIndex out of range: ${it.id}`);
  if (!it.explanation || it.explanation.length < 10)
    fail(`alexandra short explanation: ${it.id}`);
}

// 2c) abstraction: direction が concretize|abstract
for (const it of getLogicDrillItemsByType("abstraction")) {
  if (it.type !== "abstraction") continue;
  if (it.direction !== "concretize" && it.direction !== "abstract")
    fail(`abstraction bad direction: ${it.id}`);
}

// 2d) compare: optionA/optionB 非空
for (const it of getLogicDrillItemsByType("compare")) {
  if (it.type !== "compare") continue;
  if (!it.optionA || !it.optionB) fail(`compare empty option: ${it.id}`);
}

// 3) flaw_finder は answerFlaw が全種を最低1問カバー
const flawItems = getLogicDrillItemsByType("flaw_finder");
const flawsCovered = new Set<FlawKind>();
for (const it of flawItems) {
  if (it.type !== "flaw_finder") continue;
  if (!(it.answerFlaw in FLAW_KIND_LABELS)) fail(`bad answerFlaw: ${it.id}`);
  if (!it.explanation || it.explanation.length < 10) fail(`short explanation: ${it.id}`);
  flawsCovered.add(it.answerFlaw);
}
for (const k of Object.keys(FLAW_KIND_LABELS) as FlawKind[]) {
  if (!flawsCovered.has(k)) fail(`FlawKind not covered: ${k}`);
}

// 4) ローテーション/選定が決定的（同じ日付で同じ結果、選定はnull以外）
const day = "2026-07-08";
const t1 = getRotatedLogicDrillType(day);
const t2 = getRotatedLogicDrillType(day);
if (t1 !== t2) fail("rotation not deterministic");
if (!pickLogicDrillItem("flaw_finder", day)) fail("pick returned null for flaw_finder");
if (!pickLogicDrillItem("quick_logic", day)) fail("pick returned null for quick_logic");

if (errors > 0) {
  console.error(`\n${errors} 件のエラー`);
  process.exit(1);
}
console.log(`logic-drills OK: ${ALL_LOGIC_DRILL_ITEMS.length} items`);
