import assert from "node:assert";
import {
  applyCorrection,
  buildDocumentFeedbackModel,
} from "../src/lib/documents/feedback-anchors";

const text =
  "私は高校で地域の防災活動に取り組んできた。\n　その中で、高齢者への情報の届け方に課題があると感じた。貴学で社会学を学びたい。";

const model = buildDocumentFeedbackModel(text, {
  languageCorrections: [
    {
      location: "第1段落",
      original: "取り組んできた",
      suggestion: "取り組んだ",
      type: "expression",
      reason: "時制",
    },
    {
      location: "第1段落",
      original: "本文に無い文",
      suggestion: "x",
      type: "typo",
      reason: "x",
    },
  ],
  improvementDetails: [
    // 改行と字下げの全角空白をまたぐ引用でも当たる
    {
      location: "防災活動に取り組んできた。その中で",
      problem: "p",
      action: "a",
    },
    { location: "全体", problem: "具体性が足りない", action: "a" },
    // 文中の「」の引用でも当たる
    {
      location: "第2段落",
      problem: "「貴学で社会学を学びたい」が抽象的",
      action: "a",
    },
  ],
  apMap: [
    {
      element: "地域課題への関心",
      apQuote: "q",
      status: "met",
      evidence: "高齢者への情報の届け方",
      advice: null,
    },
    {
      element: "語学力",
      apQuote: "q",
      status: "missing",
      evidence: null,
      advice: "a",
    },
  ],
});

const spans = (key: string) => model.itemByKey.get(key)!.spans;
const at = text.indexOf("取り組んできた");
assert.deepEqual(spans("language:0"), [{ start: at, end: at + 7 }]);
assert.equal(spans("language:1").length, 0);
assert.equal(spans("improvement:0").length, 1);
assert.equal(
  text.slice(spans("improvement:0")[0].start, spans("improvement:0")[0].end),
  "防災活動に取り組んできた。\n　その中で"
);
assert.equal(spans("improvement:1").length, 0);
assert.equal(
  text.slice(spans("improvement:2")[0].start, spans("improvement:2")[0].end),
  "貴学で社会学を学びたい"
);
assert.equal(spans("ap:0").length, 1);

// 見つからないものは全体へ。APの欠けている要素は対応表に出すので全体に入れない
assert.deepEqual(
  model.unanchored.map((i) => i.key),
  ["language:1", "improvement:1"]
);
assert.deepEqual(
  model.marked.map((i) => i.key),
  ["language:0", "improvement:0", "improvement:2", "ap:0"]
);

// 区間は本文全体を隙間なく覆う
assert.equal(model.segments[0].start, 0);
assert.equal(model.segments[model.segments.length - 1].end, text.length);
for (let i = 1; i < model.segments.length; i++)
  assert.equal(model.segments[i].start, model.segments[i - 1].end);

// 赤ペンを入れるのは最初の1か所だけ。原文が無ければ入れない
assert.equal(applyCorrection("AとAとA", "A", "B"), "BとAとA");
assert.equal(applyCorrection("abc", "x", "y"), null);
assert.equal(applyCorrection("abc", "", "y"), null);

console.log("verify-document-anchors: ok");
