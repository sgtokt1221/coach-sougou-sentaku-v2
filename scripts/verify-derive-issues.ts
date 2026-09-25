/**
 * deriveWeaknessIssues の検査。添削結果の判定欄から、設計書 3.1 の弱点が
 * 期待どおり積まれるか（AI が同じ弱点を挙げていれば足さないか）を見る。
 */
import assert from "node:assert";
import { deriveWeaknessIssues } from "../src/lib/essay/derive-weakness-issues";
import { canonicalLabel } from "../src/lib/growth/weakness-taxonomy";
import type { SentenceCheckResult } from "../src/lib/essay/sentence-check-judge";

const L = canonicalLabel;
const broken = (
  kind: SentenceCheckResult["brokenSentences"][number]["kind"],
  n: number
) =>
  Array.from({ length: n }, (_, i) => ({
    original: `文${kind}${i}。`,
    location: `第1段落 ${i + 1}文目`,
    kind,
    problem: "p",
    rewrite: "r",
  }));
const areas = (xs: { area: string }[]) => xs.map((x) => x.area).sort();

// 文の点検: ねじれ2文 → twist、助詞1文＋語1文 → grammar、誤字3文 → typo、矛盾 → contradiction
{
  const out = deriveWeaknessIssues(
    { repeatedIssues: [] },
    {
      brokenSentences: [
        ...broken("twist", 2),
        ...broken("particle", 1),
        ...broken("collocation", 1),
        ...broken("typo", 3),
      ],
      contradictions: [{ first: "A。", second: "B。", explanation: "e" }],
    }
  );
  assert.deepEqual(
    areas(out),
    [
      L("expression.twist"),
      L("expression.grammar"),
      L("expression.typo"),
      L("logic.contradiction"),
    ].sort()
  );
}
// 閾値未満は積まない
{
  const out = deriveWeaknessIssues(
    { repeatedIssues: [] },
    {
      brokenSentences: [...broken("twist", 1), ...broken("typo", 2)],
      contradictions: [],
    }
  );
  assert.deepEqual(out, []);
}
// 判定欄: 主題ずれ・要求の欠落・読み違い・知識の誤り・字数不足
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: false,
        subjectMatch: "narrower",
        requirements: [
          { requirement: "二つ挙げよ", status: "missing", evidence: "" },
        ],
        note: "n",
      },
      reportInsights: { misreadings: ["筆者の主張を逆に読んでいる"] } as never,
      knowledgeInsights: {
        basis: "b",
        errors: [{ claim: "c", correction: "x", severity: "critical" }],
      } as never,
      quantitativeAnalysis: { fillRate: 55 } as never,
    },
    null
  );
  assert.deepEqual(
    areas(out),
    [
      L("structure.off_topic"),
      L("responsiveness.missing_requirement"),
      L("responsiveness.misread"),
      L("responsiveness.knowledge_error"),
      L("responsiveness.too_short"),
    ].sort()
  );
}
// ブロック課題（partial）は字数不足と要求の欠落を積まない
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: true,
        subjectMatch: "same",
        requirements: [{ requirement: "r", status: "missing", evidence: "" }],
        note: "",
      },
      quantitativeAnalysis: { fillRate: 20 } as never,
    },
    null,
    { partial: true }
  );
  assert.deepEqual(out, []);
}
// AI が同じ弱点を挙げていれば足さない（場所ラベルでも説明文から同じ弱点に寄るなら重複）
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [
        {
          area: "第1段落・第3段落",
          category: "expression",
          count: 1,
          message: "一文が長く主語と述語がねじれている",
        },
      ],
    },
    { brokenSentences: broken("twist", 3), contradictions: [] }
  );
  assert.equal(out.length, 1, "twist を二重に積まない");
}
// 冪等: 出力をもう一度通しても増えない
{
  const fb = {
    repeatedIssues: [],
    quantitativeAnalysis: { fillRate: 50 } as never,
  };
  const once = deriveWeaknessIssues(fb, {
    brokenSentences: broken("twist", 2),
    contradictions: [],
  });
  const twice = deriveWeaknessIssues(
    { ...fb, repeatedIssues: once },
    { brokenSentences: broken("twist", 2), contradictions: [] }
  );
  assert.equal(twice.length, once.length);
}
console.log("[verify-derive-issues] OK");
