import assert from "node:assert";
import {
  applyCorrection,
  buildDocumentFeedbackModel,
} from "../src/lib/documents/feedback-anchors";
import {
  buildProgress,
  collectPreviousIssues,
} from "../src/lib/documents/progress";

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

// 面接の質問は引用の箇所に結び付き、全体には入らない
{
  const m = buildDocumentFeedbackModel(text, {
    interviewQuestions: [
      {
        quote: "情報の届け方に課題がある",
        question: "q",
        intent: "i",
        prep: "p",
      },
      { quote: "本文に無い", question: "q", intent: "i", prep: "p" },
    ],
  });
  assert.equal(m.itemByKey.get("interview:0")!.spans.length, 1);
  assert.equal(m.itemByKey.get("interview:1")!.spans.length, 0);
  assert.equal(m.unanchored.length, 0);
}

// 前回比：赤ペンは原文が残っているかで決まる。改善点と欠けていたAPの要素は判定に回す
{
  const previous = {
    apAlignmentScore: 5,
    structureScore: 6,
    languageCorrections: [
      {
        location: "",
        original: "取り組んできた",
        suggestion: "取り組んだ",
        type: "expression" as const,
        reason: "",
      },
      {
        location: "",
        original: "消えた文",
        suggestion: "x",
        type: "typo" as const,
        reason: "",
      },
    ],
    improvementDetails: [
      { location: "全体", problem: "具体性が足りない", action: "a" },
    ],
    apMap: [
      {
        element: "関心",
        apQuote: "q",
        status: "met" as const,
        evidence: null,
        advice: null,
      },
      {
        element: "語学力",
        apQuote: "q",
        status: "missing" as const,
        evidence: null,
        advice: "a",
      },
    ],
  };
  const { language, toJudge } = collectPreviousIssues(previous, text);
  assert.deepEqual(
    language.map((l) => l.status),
    ["unchanged", "resolved"]
  );
  assert.deepEqual(
    toJudge.map((t) => t.key),
    ["improvement:0", "ap:1"]
  );

  const judged = new Map([
    ["improvement:0", { status: "improved" as const, note: "n" }],
  ]);
  const progress = buildProgress({
    previous,
    previousAt: "2026-10-01T00:00:00Z",
    language,
    toJudge,
    judged,
  });
  // 判定の無い指摘（ap:1）は出さない。赤ペンは計算分がそのまま入る
  assert.deepEqual(
    progress.items.map((i) => i.status),
    ["improved", "unchanged", "resolved"]
  );
  assert.equal(progress.previousScores.apAlignment, 5);
  assert.equal(progress.previousScores.originality, null);

  // 判定に失敗したときは赤ペンだけ
  assert.equal(
    buildProgress({
      previous,
      previousAt: null,
      language,
      toJudge,
      judged: null,
    }).items.length,
    2
  );
}

console.log("verify-document-anchors: ok");
