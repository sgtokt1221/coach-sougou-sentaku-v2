import assert from "node:assert";
import {
  getAllLectures,
  getLectureById,
  hasScenes,
} from "../src/data/essay-lectures";

const all = getAllLectures();
assert.ok(all.length >= 8, `lectures: ${all.length}`);

// order は 1 始まりの連番
all.forEach((l, i) => assert.equal(l.order, i + 1, `order broken at ${l.id}`));

// 既存8講は sections を持ったまま（移行前でも講座が壊れない）
const first = getLectureById("essay-basics-01");
assert.ok(first, "essay-basics-01 not found");
assert.ok(first!.sections.length > 0 || hasScenes(first!), "no content");

// scenes を持つ講は hasScenes が true
for (const l of all) {
  assert.equal(hasScenes(l), (l.scenes?.length ?? 0) > 0, `hasScenes: ${l.id}`);
}

console.log("lecture types OK");
