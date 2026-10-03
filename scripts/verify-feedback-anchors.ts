import assert from "node:assert/strict";
import {
  anchorDeterministically,
  buildAnchors,
  buildSegments,
  findLoose,
  listFeedbackItems,
  needsJudge,
  sentenceSpans,
} from "../src/lib/essay/feedback-anchors";
import { charDiff } from "../src/lib/text/char-diff";
import { joinOralExamAnswers } from "../src/lib/essay/oral-exam-question";
import type {
  EssayFeedback,
  OralExamQuestionSet,
} from "../src/lib/types/essay";

/**
 * 添削の指摘を本文に結び付ける計算（feedback-anchors.ts）と、赤ペンの字の差分を確かめる。
 * AI は呼ばない。
 */
let n = 0;
const ok = (cond: boolean, msg: string) => {
  assert.ok(cond, msg);
  n++;
};

// 1. 空白・改行の違いを無視して引用を見つけ、元の本文の位置で返す
{
  const text = "抗菌薬は、\n　細菌の増殖を止める。";
  const s = findLoose(text, "抗菌薬は、細菌の増殖");
  ok(
    !!s && text.slice(s.start, s.end) === "抗菌薬は、\n　細菌の増殖",
    "改行と全角空白をまたいで見つかる"
  );
  ok(findLoose(text, "存在しない文です") === null, "無い引用は null");
}

// 2. 文の切り出し: 問の見出しは文にしない
{
  const spans = sentenceSpans(
    "問1\nプラスミドが移る。接合という。\n\n問2\n耐性が広がる。"
  );
  ok(
    spans.every((s) => !/^問\d/.test(s.text)),
    "問の見出しは文にならない"
  );
  ok(spans.length === 3, `3文に分かれる（${spans.length}）`);
}

// 3. 指摘の一覧と計算での結び付け
const set: OralExamQuestionSet = {
  theme: "t",
  totalWordLimit: 300,
  subQuestions: [
    { no: 1, prompt: "p1", wordLimit: 150, aim: "" },
    { no: 2, prompt: "p2", wordLimit: 150, aim: "" },
  ],
};
const text = joinOralExamAnswers(set, [
  "プラスミドのコピーが接合管を通じて移される。その細菌も耐性菌を持つことになる。",
  "排出ポンプは複数の薬を外に出す。",
]);
const feedback: Partial<EssayFeedback> = {
  languageCorrections: [
    {
      location: "問1",
      original: "その細菌も耐性菌を持つことになる。",
      suggestion: "その細菌も耐性を獲得することになる。",
      type: "grammar",
      reason: "主語と述語のねじれ",
    },
  ],
  improvements: [
    "「排出ポンプは複数の薬を外に出す」の仕組みをもう一段書く",
    "結論が書かれていない",
  ],
  goodPoints: ["用語が正確"],
  repeatedIssues: [],
  oralExamInsights: {
    subQuestions: [{ no: 2, verdict: "partial", comment: "仕組みが足りない" }],
  },
};
const items = listFeedbackItems(feedback);
const det = anchorDeterministically(text, items, set);
{
  const lang = det.get("language:0")!;
  ok(
    text.slice(lang[0].start, lang[0].end) ===
      "その細菌も耐性菌を持つことになる。",
    "赤ペンは元の文に当たる"
  );
  ok(
    (det.get("improvement:0") ?? []).length === 1,
    "引用のある改善点は本文に当たる"
  );
  ok(
    (det.get("improvement:1") ?? []).length === 0,
    "引用の無い改善点は当たらない"
  );
  const sq = det.get("subQuestion:0")!;
  ok(
    text.slice(sq[0].start, sq[0].end) === "排出ポンプは複数の薬を外に出す。",
    "小問の判定は問2の答え全体に付く"
  );
  const judgeKeys = items
    .filter((i) => needsJudge(i, det.get(i.key)))
    .map((i) => i.key);
  ok(
    judgeKeys.includes("improvement:1") && judgeKeys.includes("goodPoint:0"),
    "当たらない指摘は AI 判定に回る"
  );
  ok(
    !judgeKeys.includes("subQuestion:0") && !judgeKeys.includes("language:0"),
    "決まったものは AI に回さない"
  );
  const a = buildAnchors(items, det, null);
  ok(
    a.judged === false && a.items.length === items.length,
    "AI 無しでも全指摘を含めて作れる"
  );
}

// 4. 重なった範囲は区切り直し、同じ組の区間はつなぐ
{
  const segs = buildSegments(10, [
    { key: "a", spans: [{ start: 0, end: 6 }] },
    { key: "b", spans: [{ start: 4, end: 8 }] },
  ]);
  const keysAt = (i: number) =>
    segs
      .find((s) => s.start <= i && i < s.end)!
      .keys.sort()
      .join(",");
  ok(
    keysAt(1) === "a" &&
      keysAt(5) === "a,b" &&
      keysAt(7) === "b" &&
      keysAt(9) === "",
    "重なりが区切られる"
  );
  ok(
    segs.reduce((m, s) => m + (s.end - s.start), 0) === 10,
    "区間で本文全体を覆う"
  );
}

// 5. 字の差分: 変わった字だけが del/ins になる
{
  const d = charDiff("その細菌も耐性菌を持つ", "その細菌も耐性を獲得する");
  const del = d
    .filter((p) => p.type === "del")
    .map((p) => p.text)
    .join("");
  const ins = d
    .filter((p) => p.type === "ins")
    .map((p) => p.text)
    .join("");
  ok(
    d[0].type === "same" && d[0].text.startsWith("その細菌も耐性"),
    "共通の頭は same"
  );
  ok(
    del.length <= 4 && ins.length <= 4,
    `差分は短い（消す「${del}」足す「${ins}」）`
  );
  const join = (t: "del" | "ins") =>
    d
      .filter((p) => p.type !== t)
      .map((p) => p.text)
      .join("");
  ok(
    join("ins") === "その細菌も耐性菌を持つ" &&
      join("del") === "その細菌も耐性を獲得する",
    "差分から元と直しを復元できる"
  );
}

console.log(`[verify-feedback-anchors] OK (${n}件)`);
