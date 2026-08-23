// scripts/validate-sentence-drills.ts
import { ALL_SENTENCE_DRILL_ITEMS } from "../src/data/sentence-drills";
import { SENTENCE_DRILL_KINDS } from "../src/lib/types/sentence-drill";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[sentence-drills] ${msg}`);
  errors++;
};

const seen = new Set<string>();
for (const it of ALL_SENTENCE_DRILL_ITEMS) {
  if (seen.has(it.id)) fail(`dup id: ${it.id}`);
  seen.add(it.id);
  if (it.choices.length !== 4) fail(`choices must be 4: ${it.id}`);
  if (new Set(it.choices).size !== it.choices.length)
    fail(`dup choice: ${it.id}`);
  if (it.answerIndex < 0 || it.answerIndex > 3)
    fail(`bad answerIndex: ${it.id}`);
  if (it.explanation.trim().length < 10) fail(`short explanation: ${it.id}`);
  // particle は空欄がちょうど1つ
  if (it.kind === "particle" && (it.sentence.match(/＿/g) ?? []).length !== 1) {
    fail(`particle needs exactly one ＿: ${it.id}`);
  }
  // 一文を切るドリルは、切る価値のある長さ（90字超）の文を出す
  if (it.kind === "sentence_length" && it.sentence.length <= 90) {
    fail(`sentence_length item too short (${it.sentence.length}): ${it.id}`);
  }
}

// 1講あたり5問×8講で使い回しても飽きない最低量
for (const kind of SENTENCE_DRILL_KINDS) {
  const n = ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === kind).length;
  if (n < 15) fail(`kind ${kind} has ${n} items (need >=15)`);
}

if (errors > 0) {
  console.error(`[sentence-drills] ${errors} error(s)`);
  process.exit(1);
}
console.log(`[sentence-drills] OK (${ALL_SENTENCE_DRILL_ITEMS.length} items)`);
