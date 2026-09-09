/**
 * 課題文の扱いによる上限の検証。
 *
 * 「読んでも読まなくても点が取れる」を潰すのが目的なので、
 * 「読まなければ確実に下がる」「資料の無い設問には一切かからない」の2点を
 * 静的に確かめる。
 *
 * 実行: npx tsx scripts/verify-source-engagement.ts
 */

import assert from "node:assert";
import {
  sourceEngagementCaps,
  sourceEngagementLabel,
} from "../src/lib/essay/source-engagement";

const REPORT = "report";

// --- 課題文に触れていない → 主題ずれと同じ3点 ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "absent", basis: "b", quotes: [] },
  });
  assert.equal(c.content, 3);
  assert.equal(c.logic, 3);
  assert.ok(c.reason);
}

// --- 言及が浅い → 6点 ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "shallow", basis: "b", quotes: [] },
  });
  assert.equal(c.content, 6);
  assert.equal(c.logic, 6);
  assert.ok(c.reason);
}

// --- 踏まえている → 上限なし ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "grounded", basis: "b", quotes: ["筆者は〜と述べる"] },
  });
  assert.equal(c.content, 10);
  assert.equal(c.logic, 10);
  assert.equal(c.reason, null);
}

// --- report 以外には一切かからない（ここが壊れるとテーマ型が理由なく下がる） ---
{
  for (const qt of [
    undefined,
    null,
    "essay",
    "english-reading",
    "data-analysis",
    "mixed",
    "lecture",
  ]) {
    const c = sourceEngagementCaps({
      questionType: qt,
      engagement: { level: "absent", basis: "b", quotes: [] },
      misreadings: ["取り違え"],
    });
    assert.equal(
      c.content,
      10,
      `questionType=${qt} で content に上限がかかった`
    );
    assert.equal(c.logic, 10, `questionType=${qt} で logic に上限がかかった`);
    assert.equal(c.reason, null);
  }
}

// --- 誤読は logic だけを4点に。構成・表現まで巻き込まない ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "grounded", basis: "b", quotes: ["引用"] },
    misreadings: ["筆者の主張を逆に読んでいる"],
  });
  assert.equal(c.content, 10);
  assert.equal(c.logic, 4);
  assert.ok(c.reason);
}

// --- 触れていない かつ 誤読 → より厳しいほうを採る ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "absent", basis: "b", quotes: [] },
    misreadings: ["誤読"],
  });
  assert.equal(c.content, 3);
  assert.equal(c.logic, 3);
}

// --- 判定が取れなかったら減点しない（AIが欄を埋め忘れただけの答案を落とさない） ---
{
  for (const e of [undefined, null]) {
    const c = sourceEngagementCaps({ questionType: REPORT, engagement: e });
    assert.equal(c.content, 10);
    assert.equal(c.logic, 10);
    assert.equal(c.reason, null);
  }
  // 誤読だけ取れている場合は logic を抑える
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: null,
    misreadings: ["誤読"],
  });
  assert.equal(c.logic, 4);
}

// --- misreadings が空配列なら減点しない ---
{
  const c = sourceEngagementCaps({
    questionType: REPORT,
    engagement: { level: "grounded", basis: "b", quotes: [] },
    misreadings: [],
  });
  assert.equal(c.logic, 10);
  assert.equal(c.reason, null);
}

// --- ラベルは3つとも文言がある ---
{
  for (const lv of ["grounded", "shallow", "absent"] as const) {
    assert.ok(sourceEngagementLabel(lv).length > 0);
  }
  assert.notEqual(
    sourceEngagementLabel("absent"),
    sourceEngagementLabel("grounded")
  );
}

console.log("verify-source-engagement OK");
