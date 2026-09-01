import assert from "node:assert/strict";
import { reportMaterials } from "@/data/essay-report-materials";
import { isEssayField } from "@/lib/types/essay-field";

function validate() {
  const ids = new Set<string>();
  for (const m of reportMaterials) {
    assert.ok(m.id && !ids.has(m.id), `id 重複または空: ${m.id}`);
    ids.add(m.id);
    assert.ok(isEssayField(m.field), `不正な field: ${m.field}`);
    assert.ok(m.title.length > 0, `title 空: ${m.id}`);
    assert.ok(
      m.body.length >= 8000 && m.body.length <= 13000,
      `body 字数が範囲外(${m.body.length}): ${m.id}`
    );
    // 設問が問いの形になっていること。観点の羅列を設問に流用すると、
    // 何を書けばよいかが定まらず、生徒もAIコーチも方向を決められない。
    assert.ok(m.question?.trim(), `question 空: ${m.id}`);
    assert.ok(
      /(述べなさい|論じなさい|説明しなさい)/.test(m.question),
      `question が問いの形になっていない: ${m.id}`
    );
    assert.ok(m.question.endsWith("。"), `question は句点で終える: ${m.id}`);
    assert.ok(
      m.question.length <= 200,
      `question が長すぎる(${m.question.length}): ${m.id}`
    );
    assert.ok(m.focusPoints.length >= 3, `focusPoints は3つ以上: ${m.id}`);
    assert.ok(m.recommendedWordLimit > 0, `recommendedWordLimit 不正: ${m.id}`);
  }
  console.log(`[validate-report-materials] OK (${reportMaterials.length}件)`);
}

validate();
