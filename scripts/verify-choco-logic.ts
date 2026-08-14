import assert from "node:assert";
import { computeChocoTotal } from "../src/lib/choco/score";
import { blendPracticeScores } from "../src/lib/choco/blend";

// 満点でも50に届かない。1段落だけでは独自性・議論の成熟度を示しきれないため、
// その2軸を3軸平均 − 0.9 で置く（src/lib/choco/score.ts）
assert.equal(computeChocoTotal({ logic: 10, coherence: 10, expression: 10 }), 49);
assert.equal(computeChocoTotal({ logic: 0, coherence: 0, expression: 0 }), 0);
// 全軸6点（平均的な段落）は、同じく全軸6点の本添削30点より少し低く出る
assert.equal(computeChocoTotal({ logic: 6, coherence: 6, expression: 6 }), 29);
// 範囲外の入力は 0-10 に丸める
assert.equal(
  computeChocoTotal({ logic: 15, coherence: 5, expression: 5 }),
  computeChocoTotal({ logic: 10, coherence: 5, expression: 5 }),
);
// つながりは本添削の「構成」の配点(12)を借りるので、論理(12)と同じ重みになる
assert.equal(
  computeChocoTotal({ logic: 8, coherence: 6, expression: 6 }),
  computeChocoTotal({ logic: 6, coherence: 8, expression: 6 }),
);

assert.deepEqual(blendPracticeScores([], [], 0.5), { avg: null, count: 0 });
assert.equal(blendPracticeScores([40], [], 0.5).avg, 40);
assert.equal(blendPracticeScores([], [30], 0.5).avg, 30);
assert.ok(Math.abs(blendPracticeScores([40], [20], 0.5).avg! - 33.3333) < 0.01);
assert.equal(blendPracticeScores([40], [20], 0.5).count, 2);

console.log("choco logic OK");
