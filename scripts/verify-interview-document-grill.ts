/**
 * 書類激詰めモードの検査。
 * 激詰め版に書類が入り、自己紹介から始めず、「責めず」を含まないこと。
 * 目印が無いとき・個人面接以外では、従来の指示文のままであること。
 *   npx tsx scripts/verify-interview-document-grill.ts
 */
import assert from "node:assert/strict";
import {
  buildInterviewSystemPrompt,
  buildGrillDocumentBlock,
  buildSubmittedDocumentBlock,
  buildIndividualTimeCue,
  buildInterviewEvaluationPrompt,
} from "../src/lib/ai/prompts/interview";
import { buildRealtimeIndividualInstructions } from "../src/lib/ai/prompts/interview-realtime";
import { splitDocumentSentences } from "../src/lib/interview/document-defense-judge";
import {
  interviewModeLabel,
  type InterviewMode,
} from "../src/lib/types/interview";

const DOC = `<document title="志望理由書">私は地域の高齢者の孤立を解消したいと考え、貴学を志望します。</document>`;
const MODES: InterviewMode[] = [
  "individual",
  "group_discussion",
  "presentation",
  "oral_exam",
];

const build = (mode: InterviewMode, grill?: boolean, doc = DOC) =>
  buildInterviewSystemPrompt(
    mode,
    "テスト大学",
    "テスト学部",
    "AP本文",
    "（過去の弱点なし）",
    undefined,
    undefined,
    undefined,
    undefined,
    doc,
    grill
  );

// 文字の面接: 激詰め版
const grill = build("individual", true);
assert.ok(grill.includes("地域の高齢者の孤立を解消したい"), "書類本文が入る");
assert.ok(grill.includes("書類の一文を「」で引用"), "1問目で引用する");
assert.ok(!grill.includes("自己紹介をお願いします"), "自己紹介を求めない");
assert.ok(!grill.includes("責めず"), "激詰めは「責めず」を含まない");
assert.ok(!grill.includes("{{"), "置換漏れが無い");
assert.ok(grill.includes("テスト大学テスト学部"));

// 文字の面接: 目印なし・他モードは従来どおり
for (const mode of MODES) {
  assert.equal(
    build(mode, false),
    build(mode, undefined),
    `${mode}: false と未指定が同じ`
  );
  assert.ok(
    !build(mode).includes("書類の中身を冷静に精査"),
    `${mode}: 激詰め文が混ざらない`
  );
  if (mode !== "individual") {
    assert.equal(
      build(mode, true),
      build(mode),
      `${mode}: 個人面接以外では目印を無視`
    );
  }
}
assert.ok(build("individual").includes("緊張をほぐす挨拶から始めてください"));
assert.ok(
  build("individual").includes(buildSubmittedDocumentBlock("individual", DOC))
);

// 書類ブロック
assert.equal(buildGrillDocumentBlock(""), "");
assert.equal(buildGrillDocumentBlock("   "), "");
assert.ok(!buildGrillDocumentBlock(DOC).includes("責めず"));

// 音声の面接
const rt = (mode: InterviewMode, grill?: boolean) =>
  buildRealtimeIndividualInstructions(
    mode,
    "テスト大学",
    "テスト学部",
    "AP本文",
    "（過去の弱点なし）",
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    grill
  );
const rtGrill = rt("individual", true);
assert.ok(
  rtGrill.includes("一文を「」で言葉どおりに引用"),
  "音声: 1問目で引用する"
);
assert.ok(
  !rtGrill.includes("3分程度で自己紹介をお願いできますか"),
  "音声: 自己紹介を求めない"
);
assert.ok(rtGrill.includes("書類の中身を冷静に精査"));
for (const mode of [
  "individual",
  "presentation",
  "oral_exam",
] as InterviewMode[]) {
  assert.equal(rt(mode, false), rt(mode), `音声 ${mode}: false と未指定が同じ`);
  if (mode !== "individual")
    assert.equal(rt(mode, true), rt(mode), `音声 ${mode}: 目印を無視`);
}
assert.ok(rt("individual").includes("3分程度で自己紹介をお願いできますか"));

// 所要時間（10〜20分）と自己紹介（3分程度）
assert.ok(build("individual").includes("3分程度で自己紹介をお願いします"));
for (const p of [build("individual"), grill, rt("individual"), rtGrill]) {
  assert.ok(/10\s*〜\s*20\s*分/.test(p), "個人・激詰めは10〜20分");
}
assert.ok(buildIndividualTimeCue(5 * 60).includes("まだ締めくくりに入らず"));
assert.ok(buildIndividualTimeCue(12 * 60).includes("15分に向けて"));
assert.ok(buildIndividualTimeCue(16 * 60).includes("締めくくりに向かって"));
assert.ok(
  buildIndividualTimeCue(19 * 60).includes("以上で面接を終了いたします")
);

// 採点: 自己紹介の見方は通常の個人面接だけ。短く終わった回は材料の範囲で採点
const evalOf = (
  mode: string,
  opts?: { documentGrill?: boolean; durationSeconds?: number }
) =>
  buildInterviewEvaluationPrompt(
    "大",
    "学部",
    "AP",
    mode,
    undefined,
    undefined,
    opts
  );
assert.ok(evalOf("individual").includes("自己紹介の見方"));
assert.ok(
  !evalOf("individual", { documentGrill: true }).includes("自己紹介の見方")
);
assert.ok(!evalOf("oral_exam").includes("自己紹介の見方"));
assert.ok(
  evalOf("individual", { durationSeconds: 6 * 60 }).includes("想定より短く")
);
assert.ok(
  !evalOf("individual", { durationSeconds: 15 * 60 }).includes("想定より短く")
);
assert.ok(
  evalOf("individual", { durationSeconds: 15 * 60 }).includes("15 分でした")
);
assert.ok(
  !evalOf("group_discussion", { durationSeconds: 6 * 60 }).includes("面接時間")
);

// 表示名
assert.equal(interviewModeLabel("individual", true), "書類激詰め");
assert.equal(interviewModeLabel("individual"), "個人面接");
assert.equal(interviewModeLabel("oral_exam", true), "口頭試問");

// 書類の文の切り分け（PDF から貼った文中の改行を詰める。書類ごとに題名を持つ）
const split = splitDocumentSentences(
  `<document title="志望理由書" type="志望理由書">\n私は地域の高齢者の孤\n立を解消したいと考えます。理由は二つあります。\n</document>\n<document title="自己推薦書" type="自己推薦書">\n部活動で部長を務めました！\n</document>`
);
assert.deepEqual(
  split.map((x) => [x.documentTitle, x.text]),
  [
    ["志望理由書", "私は地域の高齢者の孤立を解消したいと考えます。"],
    ["志望理由書", "理由は二つあります。"],
    ["自己推薦書", "部活動で部長を務めました！"],
  ]
);
assert.equal(splitDocumentSentences("   ").length, 0);

console.log("verify-interview-document-grill: OK");
