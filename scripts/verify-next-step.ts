import assert from "node:assert";
import {
  nextRankGap,
  biggestHeadroom,
  buildNextStepHint,
} from "../src/lib/essay/next-step";
import type { EssayScores } from "../src/lib/types/essay";

// 50点満点。B は 60% = 30点なので、23点なら「あと7点でB」
assert.deepEqual(nextRankGap(23, 50), { nextRank: "B", needed: 7 });
// C は 45% = 22.5点。22点なら先に C が来る
assert.deepEqual(nextRankGap(22, 50), { nextRank: "C", needed: 0.5 });
// 最高ランクなら次が無い
assert.equal(nextRankGap(46, 50), null);
// 満点でも落ちない
assert.equal(nextRankGap(50, 50), null);
// 満点が40の答案でも割合で計算する（B=24点）
assert.deepEqual(nextRankGap(20, 40), { nextRank: "B", needed: 4 });
// 境界ちょうどは「あと0点」にしない
const boundary = nextRankGap(29.9999, 50);
assert.ok(boundary && boundary.needed >= 0.1);

// 伸びしろは「点が低い軸」ではなく「配点で見て一番増える軸」。
// 成熟度(配点5)が2点(伸びしろ4.0)でも、構成(配点12)の6点(4.8)を選ぶ
const scores = {
  structure: 6,
  logic: 8,
  expression: 8,
  responsiveness: 8,
  reasoningMaturity: 2,
} as const;
const head = biggestHeadroom(scores);
assert.equal(head?.axis, "structure", `選ばれたのは ${head?.axis}`);
assert.equal(head?.gain, 4.8);

// 全軸満点なら伸びしろ無し
assert.equal(
  biggestHeadroom({
    structure: 10,
    logic: 10,
    expression: 10,
    responsiveness: 10,
    reasoningMaturity: 10,
  }),
  null
);

// 採点されていない軸は無視する（旧データに議論の成熟度が無い）
assert.equal(
  biggestHeadroom({
    structure: 10,
    logic: 10,
    expression: 10,
    responsiveness: 9,
  })?.axis,
  "responsiveness"
);

// まとめ役は両方そろったときだけ返す
const full = { ...scores, apAlignment: 5, total: 23 } as unknown as EssayScores;
assert.ok(buildNextStepHint(full, 50));
assert.equal(
  buildNextStepHint({ ...full, total: 48 } as unknown as EssayScores, 50),
  null
);

console.log("next step OK");
