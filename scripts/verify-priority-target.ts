import assert from "node:assert";
import { detectPriorityTarget } from "../src/lib/essay/review-core";

const corrections = [
  {
    original:
      "実際、私の高校では昨年の休校中にオンライン授業が行われることによって、通学に片道一時間かかる生徒も自宅で同じ授業を受けることができるようになるということが実現されて、とても良かったと思います。",
  },
  { original: "受けることができるようになるということが実現されて" },
];

// 赤ペンで挙げた文を引用していれば「赤ペンを指している」
assert.equal(
  detectPriorityTarget(
    "メインの一文が長すぎて読みにくいため、「オンライン授業が行われることによって」の前後で文を二つに分けましょう。",
    corrections,
  ),
  "language",
);

// 引用が無ければ改善点を指しているとみなす
assert.equal(
  detectPriorityTarget(
    "欠けているブロックを「根拠・具体例」と名指しすると、設問への答えが明確になります。",
    corrections,
  ),
  "improvement",
);

// 引用があっても赤ペンの文に含まれないなら改善点
assert.equal(
  detectPriorityTarget("結論で「とても良かった」と感想で終えないこと。", [
    { original: "まったく別の文です。" },
  ]),
  "improvement",
);

// 短すぎる引用（助詞レベル）は判定に使わない
assert.equal(
  detectPriorityTarget("「実際」の使い方を見直しましょう。", corrections),
  "improvement",
);

// 良いところ・改善点にも出てくる引用は赤ペンを指す根拠にしない
// （良い文を「今回は『◯◯』を中心に」と引いたら、その文が赤ペンの対象でもあった）
assert.equal(
  detectPriorityTarget(
    "今回は「オンライン授業が行われることによって」を理由の中心に据えて書き直そう。",
    corrections,
    ["「オンライン授業が行われることによって」は、この設問ならではの具体例です。"],
  ),
  "improvement",
);

// 赤ペンが無い答案でも落ちない
assert.equal(detectPriorityTarget("構成を直しましょう。", []), "improvement");

console.log("priority target OK");
