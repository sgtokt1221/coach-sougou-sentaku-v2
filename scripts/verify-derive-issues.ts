/**
 * deriveWeaknessIssues の検査。添削結果の判定欄から、設計書 3.1 の弱点が
 * 期待どおり積まれるか（AI が同じ弱点を挙げていれば足さないか）を見る。
 */
import assert from "node:assert";
import {
  deriveWeaknessIssues,
  DERIVED_ISSUE_IDS,
} from "../src/lib/essay/derive-weakness-issues";
import {
  canonicalLabel,
  getTaxonomyEntry,
} from "../src/lib/growth/weakness-taxonomy";
import type { SentenceCheckResult } from "../src/lib/essay/sentence-check-judge";

// derive が使う ID はすべて正本（weakness-taxonomy.ts）で引ける
for (const id of DERIVED_ISSUE_IDS)
  assert.ok(getTaxonomyEntry(id), `${id} が正本に無い`);

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
// off_topic: note が空なら既定文
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: true,
        subjectMatch: "narrower",
        requirements: [],
        note: "",
      },
    },
    null
  );
  const issue = out.find((i) => i.area === L("structure.off_topic"));
  assert.ok(issue, "off_topic が積まれていない");
  assert.equal(issue!.message, "設問の主題と答案の中心がずれている。");
}
// misreadings が無く claimChecks の contradicted だけのときも misread を積む
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      claimChecks: [
        {
          claim: "c",
          type: "statistic",
          status: "contradicted",
          evidence: "e",
        },
      ],
    },
    null
  );
  assert.deepEqual(areas(out), [L("responsiveness.misread")]);
}
// fillRate が null なら too_short を積まない
{
  const out = deriveWeaknessIssues(
    { repeatedIssues: [], quantitativeAnalysis: { fillRate: null } as never },
    null
  );
  assert.deepEqual(out, []);
}
// 旧データ（subjectMatch が無く answersQuestion=false）は off_topic を採点と同じ規則で積む
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: false,
        requirements: [],
        note: "",
      },
    },
    null
  );
  assert.deepEqual(areas(out), [L("structure.off_topic")]);
}
// partial + narrower は off_topic を積まない（1ブロックだけ書く課題では起きて当然）
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: true,
        subjectMatch: "narrower",
        requirements: [],
        note: "",
      },
    },
    null,
    { partial: true }
  );
  assert.deepEqual(out, []);
}
// partial + different は off_topic を積む
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: true,
        subjectMatch: "different",
        requirements: [],
        note: "",
      },
    },
    null,
    { partial: true }
  );
  assert.deepEqual(areas(out), [L("structure.off_topic")]);
}
// 長い引用は60字以内に切られる
{
  const longOriginal = "あ".repeat(100);
  const out = deriveWeaknessIssues(
    { repeatedIssues: [] },
    {
      brokenSentences: broken("twist", 2).map((b) => ({
        ...b,
        original: longOriginal,
      })),
      contradictions: [],
    }
  );
  const issue = out.find((i) => i.area === L("expression.twist"));
  assert.ok(issue);
  const quoted = issue!.message.match(/「(.+?)」/)?.[1] ?? "";
  assert.ok(quoted.length <= 60, `引用が60字を超えている: ${quoted.length}`);
  assert.ok(quoted.endsWith("…"));
}
// 主題ずれの note は説明文なので120字で切る（短ければそのまま）
{
  const derive = (note: string) =>
    deriveWeaknessIssues(
      {
        repeatedIssues: [],
        taskFulfillment: {
          answersQuestion: false,
          subjectMatch: "different",
          requirements: [],
          note,
        },
      },
      null
    ).find((i) => i.area === L("structure.off_topic"))!.message;
  const long = derive("い".repeat(200));
  assert.equal(
    long.length,
    120,
    `note が120字で切られていない: ${long.length}`
  );
  assert.ok(long.endsWith("…"));
  assert.equal(derive("主題がずれている。"), "主題がずれている。");
}
// 読み違いは引用でなく説明なので100字で切る（60字では切らない）
{
  const derive = (m: string) =>
    deriveWeaknessIssues(
      { repeatedIssues: [], reportInsights: { misreadings: [m] } as never },
      null
    ).find((i) => i.area === L("responsiveness.misread"))!.message;
  const mid = "う".repeat(80);
  assert.equal(derive(mid), mid, "80字の読み違いが切られている");
  const long = derive("う".repeat(150));
  assert.equal(
    long.length,
    100,
    `読み違いが100字で切られていない: ${long.length}`
  );
  assert.ok(long.endsWith("…"));
}

console.log("[verify-derive-issues] OK");
