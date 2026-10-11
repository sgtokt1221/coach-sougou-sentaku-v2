import assert from "node:assert";
import {
  essayResultKind,
  focusVisibleKeys,
  pickFocus,
} from "../src/lib/essay/result-focus";

// タイプの判定
assert.equal(essayResultKind("oral_exam"), "oral");
assert.equal(essayResultKind("lecture"), "lecture");
assert.equal(essayResultKind("data-analysis"), "data");
assert.equal(essayResultKind("mixed"), "data");
assert.equal(essayResultKind("report"), "passage");
assert.equal(essayResultKind("essay", "課題文の本文"), "passage");
assert.equal(essayResultKind("essay", "  "), "theme");
assert.equal(essayResultKind(null), "theme");

const base = {
  priorityImprovement: "比べる観点を1つに絞る",
  priorityTarget: "improvement" as const,
  improvements: ["比べる観点を1つに絞る", "結論を短く"],
};

// 基本は最優先の改善点。それが指す改善点1件目のキーも印にする
assert.deepEqual(pickFocus(base, "theme"), {
  text: "比べる観点を1つに絞る",
  keys: ["priority:0", "improvement:0"],
});
assert.deepEqual(
  pickFocus({ ...base, priorityTarget: "language" }, "theme")?.keys,
  ["priority:0", "language:0"]
);
// 最優先が無ければ改善点1件目、何も無ければ null
assert.deepEqual(pickFocus({ improvements: ["a"] }, "theme")?.keys, [
  "improvement:0",
]);
assert.equal(pickFocus({}, "theme"), null);

// 設問に答えていないときは差し替える。満たしている要求は印にしない
{
  const f = pickFocus(
    {
      ...base,
      taskFulfillment: {
        answersQuestion: false,
        note: "設問は原因を聞いている",
        requirements: [
          { requirement: "a", status: "met", evidence: "" },
          { requirement: "b", status: "missing", evidence: "" },
        ],
      },
    },
    "theme"
  );
  assert.equal(f?.tag, "設問への答え");
  assert.deepEqual(f?.keys, ["requirement:1"]);
}

// 課題文型の読み違いが最優先（設問への答えより先）。テーマ型では使わない
{
  const fb = {
    ...base,
    reportInsights: {
      sourceComprehension: "",
      summaryAccuracy: "",
      citationAppropriateness: "",
      analysisDepth: "",
      sourceConnection: "",
      misreadings: ["筆者はそう言っていない"],
    },
    taskFulfillment: { answersQuestion: false, note: "n", requirements: [] },
  };
  assert.equal(pickFocus(fb, "passage")?.tag, "読み違い");
  assert.equal(pickFocus(fb, "theme")?.tag, "設問への答え");
}

// 口頭試問型：答えていない問 → 重大な知識の誤り の順
{
  const fb = {
    ...base,
    oralExamInsights: {
      subQuestions: [
        { no: 1, verdict: "answered" as const, comment: "" },
        { no: 2, verdict: "partial" as const, comment: "" },
        { no: 3, verdict: "unanswered" as const, comment: "問3に答えていない" },
      ],
    },
    knowledgeInsights: {
      basis: "",
      errors: [
        {
          claim: "c",
          correction: "抗菌薬はウイルスに効かない",
          severity: "critical" as const,
        },
      ],
    },
  };
  assert.deepEqual(pickFocus(fb, "oral"), {
    tag: "問3",
    text: "問3に答えていない",
    keys: ["subQuestion:2"],
  });
  const noUnanswered = {
    ...fb,
    oralExamInsights: {
      subQuestions: fb.oralExamInsights.subQuestions.slice(0, 2),
    },
  };
  assert.equal(pickFocus(noUnanswered, "oral")?.tag, "知識の誤り");
  assert.deepEqual(pickFocus(noUnanswered, "oral")?.keys, ["knowledge:0"]);
}

// 既定の印：課題のキー＋文の誤り・誤字の赤ペン（言い回しの直しは出さない）
{
  const keys = focusVisibleKeys(
    {
      languageCorrections: [
        {
          location: "",
          original: "a",
          suggestion: "b",
          type: "grammar",
          reason: "",
        },
        {
          location: "",
          original: "a",
          suggestion: "b",
          type: "expression",
          reason: "",
        },
        {
          location: "",
          original: "a",
          suggestion: "b",
          type: "typo",
          reason: "",
        },
      ],
    },
    { text: "t", keys: ["priority:0"] }
  );
  assert.deepEqual([...keys].sort(), [
    "language:0",
    "language:2",
    "priority:0",
  ]);
}

console.log("verify-result-focus: ok");
