import assert from "node:assert/strict";
import { buildReportQuestion } from "@/lib/essay/report-question";
import { reportMaterials } from "@/data/essay-report-materials";

const q = buildReportQuestion({
  title: "限りある医療をだれに",
  focusPoints: ["配分の原理を整理する", "対立点を示す"],
  recommendedWordLimit: 1200,
});
assert.ok(q.startsWith("限りある医療をだれに"), "題名が先頭に来る");
assert.ok(q.includes("配分の原理を整理する"), "観点が入る");
assert.ok(q.includes("対立点を示す"), "観点は全部入る");
assert.ok(q.includes("1200字程度"), "字数が入る");

// 実データのすべてで、題名だけの設問にならないこと（コーチが聞き返す原因）
for (const m of reportMaterials) {
  const built = buildReportQuestion(m);
  assert.ok(
    built.length > m.title.length + 20,
    `設問が題名だけになっている: ${m.id}`
  );
  for (const f of m.focusPoints) {
    assert.ok(built.includes(f), `観点が落ちている: ${m.id} / ${f}`);
  }
}

console.log(
  `[verify-report-question] OK (${reportMaterials.length}件の課題文で確認)`
);
