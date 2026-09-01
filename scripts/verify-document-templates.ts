import assert from "node:assert/strict";
import {
  DOCUMENT_TEMPLATES,
  getDocumentTemplate,
} from "@/lib/templates/document-templates";
import { structureCriterionFor } from "@/lib/ai/prompts/document";
import { buildDocumentReviewPrompt } from "@/lib/ai/prompts/document";

/**
 * 書類の「あるべき形」が種類ごとに用意され、教える側と採点する側で
 * 同じものを見ていることを確かめる。
 *
 * 以前は採点プロンプトに独自の一覧があり、テンプレの構成例とずれていた。
 * ずれると、生徒は教わったとおりに書いたのに評価されない状態になる。
 */
const DOCUMENT_TYPES = [
  "志望理由書",
  "学業活動報告書",
  "研究計画書",
  "自己推薦書",
  "学びの設計書",
] as const;

for (const type of DOCUMENT_TYPES) {
  const t = getDocumentTemplate(type);
  assert.ok(t, `テンプレが無い: ${type}`);
  assert.ok(t.sampleStructure.trim(), `構成例が空: ${type}`);
  assert.ok(t.structureCriterion.trim(), `構成の評価軸が空: ${type}`);
  assert.ok(
    t.recommendedFrameworks.length > 0,
    `推奨フレームワークが無い: ${type}`
  );

  // 採点はテンプレの評価軸を引く（別定義に戻っていないこと）
  assert.equal(
    structureCriterionFor(type),
    t.structureCriterion,
    `採点がテンプレを見ていない: ${type}`
  );

  // 採点プロンプトにその書類の評価軸が実際に載ること
  const prompt = buildDocumentReviewPrompt({
    hasAdmissionPolicy: true,
    documentType: type,
  });
  assert.ok(prompt.includes(type), `プロンプトに書類名が無い: ${type}`);
  assert.ok(
    prompt.includes(t.structureCriterion),
    `プロンプトに評価軸が入っていない: ${type}`
  );
}

// 未知の書類名でも落ちない（既定の軸に落ちる）
assert.ok(structureCriterionFor("未知の書類").length > 0);
assert.ok(structureCriterionFor(undefined).length > 0);

assert.equal(
  DOCUMENT_TEMPLATES.length,
  DOCUMENT_TYPES.length,
  "テンプレの数が書類の種類と合っていない"
);

console.log(
  `[verify-document-templates] OK (${DOCUMENT_TYPES.length}種類の書類で確認)`
);
