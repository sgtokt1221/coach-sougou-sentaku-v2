/**
 * 弱点ラベルのフィルタが、実データで出た「場所だけのラベル」を落とし、
 * 弱点を述べているラベルは落とさないことを確かめる。
 *
 * プロンプトで「述語まで書いた言い切りの文」を求めても、モデルは
 * 「冒頭の文」「改善策の根拠」を返すことがある（2026-09-18 実測）。
 * 判定はサーバー側に置いているので、ここが緩むと弱点リストが
 * 場所の羅列で埋まる（エラーは出ない）。
 */
import assert from "node:assert";
import {
  isLocationOnlyLabel,
  isWeaknessLabel,
  resolveCanonical,
  weaknessCategoryOf,
} from "../src/lib/growth/weakness-taxonomy";

// 実データで返ってきた「場所だけ」のラベル（積んではいけない）
for (const bad of [
  "第1段落・第3段落",
  "第3段落",
  "冒頭の文",
  "第二段落の意義まとめ",
  "改善策の根拠",
  "結論の役割",
  "結論部",
]) {
  assert.equal(isLocationOnlyLabel(bad), true, `落とせていない: ${bad}`);
}

// 弱点を述べている正しいラベル（落としてはいけない）
for (const good of [
  "結論が本論の繰り返しで終わっている",
  "根拠が一般論にとどまる",
  "解決策が方向だけで中身がない",
  "一文が長く主語と述語がねじれている",
  "設問・テーマから論点がずれている",
  "文体・語彙が不適切",
  "抽象的で具体性に欠ける",
  "序論・本論・結論の構成バランスが悪い",
]) {
  assert.equal(isLocationOnlyLabel(good), false, `誤って落とした: ${good}`);
}
// 助言・欄名は従来どおり弾く
for (const bad of ["結論を一文で言い切りましょう", "logic", "全体"]) {
  assert.equal(isWeaknessLabel(bad), false, `落とせていない: ${bad}`);
}
assert.equal(isWeaknessLabel("根拠が一般論にとどまる"), true);

// area に場所が書かれたとき、「段落」の1語で「段落のつながり」に落とさず、
// 説明文から弱点を決める（2026-09-25、本番で表現力・成熟度の弱点が消えていた）
const cases: [string, string, string | undefined, string][] = [
  [
    "第1段落・第3段落",
    "一文が長く主語と述語がねじれている。例：「筆者は、集団で考える理由は…からだ」",
    "expression",
    // 長さとねじれの両方を言っているので、表現力のどちらに付いてもよい
    "expression.",
  ],
  [
    "反論段落",
    "『長期的観点から見れば大きな利点がある』と述べるが、反論への反駁が成立していない。",
    "reasoningMaturity",
    "reasoning.weak_rebuttal",
  ],
  [
    "結論段落",
    "結論が感想で終わっている。",
    "logic",
    "structure.no_conclusion",
  ],
  [
    "メリット段落",
    "なぜ解消されるかの根拠が示されていない。",
    "logic",
    "logic.weak_evidence",
  ],
  // 場所の語を含まないラベルは従来どおりラベルで決める
  ["一文が長く読みにくい", "", "expression", "expression.long_sentence"],
  ["序論・本論・結論の構成バランス", "", "structure", "structure.unbalanced"],
  ["段落のつながり・論述の流れ", "", "structure", "structure.weak_flow"],
  // 説明文の「結論」1語で「結論が不明確」へ流さない
  [
    "段落のつながり・論述の流れ",
    "前の段落の結論が次の段落の出発点になっていない箇所があります。",
    "structure",
    "structure.weak_flow",
  ],
  // 見出し語は説明文で中身を決める（「結論が不明確」に何でも集まっていた）
  [
    "結論の明確さ",
    "結論段落が本論の繰り返しにとどまっています。",
    "structure",
    "structure.conclusion_restates",
  ],
  [
    "結論の明確さ",
    "自分がどう判断するかが結論で示されていません。",
    "structure",
    "structure.no_conclusion",
  ],
  // 説明文の語に引っ張られず、ラベルの語を優先する
  [
    "反論検討",
    "反論の根拠に正面から答える練習を続けてください。",
    "logic",
    "logic.one_sided",
  ],
  // 「結び」が「結びつき」に部分一致していた
  ["自分の経験との結びつき", "", "originality", "ap.no_link"],
];
for (const [area, message, hint, expected] of cases) {
  const entry = resolveCanonical(area, {
    categoryHint: hint as Parameters<
      typeof resolveCanonical
    >[1]["categoryHint"],
    supportText: message || undefined,
  });
  const ok = expected.endsWith(".")
    ? entry?.id.startsWith(expected)
    : entry?.id === expected;
  assert.ok(ok, `${area} → ${entry?.id}（期待: ${expected}）`);
}
assert.equal(isLocationOnlyLabel("問2結論部"), true);
assert.equal(isLocationOnlyLabel("メリット段落"), true);

// カテゴリを移した正規エントリは、保存済みの古い categoryId より正本を優先する
assert.equal(
  weaknessCategoryOf({
    area: "反対意見・多面的な視点への配慮が不足している",
    canonicalId: "logic.one_sided",
    categoryId: "logic",
  }),
  "reasoningMaturity"
);

console.log("[verify-weakness-label] OK");
