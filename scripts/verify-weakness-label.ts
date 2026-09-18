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

console.log("[verify-weakness-label] OK");
