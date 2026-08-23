import assert from "node:assert";
import {
  SENTENCE_DRILL_KINDS,
  SENTENCE_DRILL_LABELS,
} from "../src/lib/types/sentence-drill";
import { pickDrillItems, gradeDrill } from "../src/lib/sentence-drill/pick";
import { ALL_SENTENCE_DRILL_ITEMS } from "../src/data/sentence-drills";

// P1 は3種
assert.deepEqual(SENTENCE_DRILL_KINDS, [
  "particle",
  "subject_predicate",
  "sentence_length",
]);
assert.equal(SENTENCE_DRILL_LABELS.particle, "てにをは");

// 同じ講義IDなら毎回同じ5問（リロードで問題が入れ替わらない）
const a = pickDrillItems("particle", "essay-basics-03", 5);
const b = pickDrillItems("particle", "essay-basics-03", 5);
assert.deepEqual(
  a.map((i) => i.id),
  b.map((i) => i.id)
);
assert.equal(a.length, 5);

// 講義が違えば出題も違う（8講で同じ5問が続かない）
const c = pickDrillItems("particle", "essay-basics-05", 5);
assert.notDeepEqual(
  a.map((i) => i.id),
  c.map((i) => i.id)
);

// 在庫より多く要求しても在庫数で止まる（重複を出さない）
const many = pickDrillItems("particle", "essay-basics-03", 999);
assert.equal(
  many.length,
  ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === "particle").length
);
assert.equal(new Set(many.map((i) => i.id)).size, many.length);

// 採点は選んだ番号と正解番号の一致だけ
const graded = gradeDrill(a, [a[0].answerIndex, -1, a[2].answerIndex, -1, -1]);
assert.equal(graded.correct, 2);
assert.equal(graded.total, 5);
assert.deepEqual(
  graded.results.slice(0, 3).map((r) => r.correct),
  [true, false, true]
);

console.log("sentence drill OK");
