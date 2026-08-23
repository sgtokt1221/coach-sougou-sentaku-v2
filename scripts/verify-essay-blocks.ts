import assert from "node:assert";
import {
  ESSAY_BLOCKS,
  ESSAY_BLOCK_LABELS,
  ESSAY_BLOCK_IDS,
  getEssayBlock,
} from "../src/lib/types/essay-block";

// 6ブロック。順番が答案を書く順そのものなので、並びも固定する
assert.deepEqual(ESSAY_BLOCK_IDS, [
  "question",
  "position",
  "reason",
  "evidence",
  "concession",
  "conclusion",
]);
assert.equal(ESSAY_BLOCKS.length, 6);

// ラベルは全ブロック分そろっている
for (const id of ESSAY_BLOCK_IDS) {
  assert.ok(ESSAY_BLOCK_LABELS[id], `label missing: ${id}`);
}
assert.equal(ESSAY_BLOCK_LABELS.position, "立場");

// 書き出しの例は各ブロックに必ずある（講義とエディタの両方で出す）
for (const b of ESSAY_BLOCKS) {
  assert.ok(b.starter.length > 0, `starter missing: ${b.id}`);
}

// 未知のIDは undefined を返す（呼び出し側で分岐できるようにする）
assert.equal(getEssayBlock("position")?.label, "立場");
assert.equal(getEssayBlock("unknown"), undefined);

console.log("essay blocks OK");
