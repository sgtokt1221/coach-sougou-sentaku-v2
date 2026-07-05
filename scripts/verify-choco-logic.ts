import assert from "node:assert";
import { computeChocoTotal } from "../src/lib/choco/score";
import { blendPracticeScores } from "../src/lib/choco/blend";

assert.equal(computeChocoTotal({ logic: 10, coherence: 10, expression: 10 }), 50);
assert.equal(computeChocoTotal({ logic: 0, coherence: 0, expression: 0 }), 0);
assert.equal(computeChocoTotal({ logic: 6, coherence: 6, expression: 6 }), 30);
assert.equal(computeChocoTotal({ logic: 15, coherence: 5, expression: 5 }), Math.round((20 / 30) * 50));

assert.deepEqual(blendPracticeScores([], [], 0.5), { avg: null, count: 0 });
assert.equal(blendPracticeScores([40], [], 0.5).avg, 40);
assert.equal(blendPracticeScores([], [30], 0.5).avg, 30);
assert.ok(Math.abs(blendPracticeScores([40], [20], 0.5).avg! - 33.3333) < 0.01);
assert.equal(blendPracticeScores([40], [20], 0.5).count, 2);

console.log("choco logic OK");
