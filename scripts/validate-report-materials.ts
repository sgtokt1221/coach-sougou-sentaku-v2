import assert from "node:assert/strict";
import { reportMaterials } from "@/data/essay-report-materials";

const VALID_FIELDS = new Set([
  "society", "economy", "education", "environment",
  "international", "law", "medical", "politics", "technology",
]);

function validate() {
  const ids = new Set<string>();
  for (const m of reportMaterials) {
    assert.ok(m.id && !ids.has(m.id), `id 重複または空: ${m.id}`);
    ids.add(m.id);
    assert.ok(VALID_FIELDS.has(m.field), `不正な field: ${m.field}`);
    assert.ok(m.title.length > 0, `title 空: ${m.id}`);
    assert.ok(
      m.body.length >= 8000 && m.body.length <= 13000,
      `body 字数が範囲外(${m.body.length}): ${m.id}`,
    );
    assert.ok(m.focusPoints.length >= 3, `focusPoints は3つ以上: ${m.id}`);
    assert.ok(m.recommendedWordLimit > 0, `recommendedWordLimit 不正: ${m.id}`);
  }
  console.log(`[validate-report-materials] OK (${reportMaterials.length}件)`);
}

validate();
