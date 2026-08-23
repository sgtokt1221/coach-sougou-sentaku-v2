import assert from "node:assert";
import {
  SENTENCE_DRILL_KINDS,
  SENTENCE_DRILL_LABELS,
} from "../src/lib/types/sentence-drill";
import { pickDrillItems, gradeDrill } from "../src/lib/sentence-drill/pick";
import { ALL_SENTENCE_DRILL_ITEMS } from "../src/data/sentence-drills";

// P2a で6種
assert.deepEqual(SENTENCE_DRILL_KINDS, [
  "particle",
  "subject_predicate",
  "sentence_length",
  "modifier",
  "style",
  "redundancy",
]);
assert.equal(SENTENCE_DRILL_LABELS.particle, "てにをは");
assert.equal(SENTENCE_DRILL_LABELS.modifier, "係り受け・指示語");

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

// 隣り合う講で出題が重ならない（1文字違いのIDでも start がずれる）
const l01 = pickDrillItems("particle", "essay-basics-01", 5).map((i) => i.id);
const l02 = pickDrillItems("particle", "essay-basics-02", 5).map((i) => i.id);
assert.equal(
  l01.filter((id) => l02.includes(id)).length,
  0,
  "隣接する講で出題が重複している"
);

// 8講ぶん出しても、特定の数問に偏らない（在庫17問のうち大半が使われる）
const used = new Set(
  Array.from({ length: 8 }, (_, i) =>
    pickDrillItems("particle", `essay-basics-0${i + 1}`, 5)
  ).flatMap((items) => items.map((i) => i.id))
);
assert.ok(used.size >= 15, `8講で使われた問題が ${used.size} 種しかない`);

console.log("sentence drill OK");
