import assert from "node:assert";
import {
  ESSAY_FORMS,
  ESSAY_FORM_IDS,
  getEssayForm,
  formStepsOf,
} from "../src/lib/types/essay-form";
import { ESSAY_BLOCK_IDS } from "../src/lib/types/essay-block";

assert.deepEqual(ESSAY_FORM_IDS, ["theme", "passage", "data", "solution"]);
assert.equal(ESSAY_FORMS.length, 4);

for (const form of ESSAY_FORMS) {
  // 6ブロックすべてに字数の目安がある（0字のブロックを作らない）
  for (const b of ESSAY_BLOCK_IDS) {
    assert.ok(form.allocation[b] > 0, `${form.id}: allocation missing ${b}`);
  }
  // 800字ちょうどに配分する。合計が合わないと講義で示す配分が嘘になる
  const total =
    ESSAY_BLOCK_IDS.reduce((s, b) => s + form.allocation[b], 0) +
    (form.extraSteps ?? []).reduce((s, e) => s + e.chars, 0);
  assert.equal(total, 800, `${form.id}: 合計 ${total}字`);

  assert.ok(form.trigger.length > 0, `${form.id}: trigger`);
  assert.ok(form.pitfall.length > 0, `${form.id}: pitfall`);
}

// 書く順番は「6ブロックの並び ＋ 追加の段を差し込んだもの」
const dataSteps = formStepsOf("data");
assert.equal(dataSteps[0].label, "読み取り（事実）");
assert.equal(dataSteps[1].label, "解釈");
assert.equal(dataSteps.length, ESSAY_BLOCK_IDS.length + 1);

// 解決策提示型はラベルを置き換える（並びは変えない）
const solution = getEssayForm("solution")!;
assert.equal(solution.labelOverrides?.reason, "原因");
assert.equal(getEssayForm("unknown"), undefined);

console.log("essay forms OK");
