import assert from "node:assert/strict";
import { buildReportQuestion } from "@/lib/essay/report-question";
import { reportMaterials } from "@/data/essay-report-materials";

const q = buildReportQuestion({
  title: "限りある医療をだれに",
  question:
    "限られた医療資源をだれに優先して配分すべきか、あなたの考えを述べなさい。",
  recommendedWordLimit: 1200,
});
assert.ok(q.startsWith("限りある医療をだれに"), "題名が先頭に来る");
assert.ok(q.includes("配分すべきか"), "設問が入る");
assert.ok(q.includes("1200字程度"), "字数が入る");

// 実データすべてで、設問が題名だけにならないこと
// （コーチが「どんな問いが出ていますか」と聞き返す原因になる）
for (const m of reportMaterials) {
  const built = buildReportQuestion(m);
  assert.ok(built.includes(m.question), `設問が落ちている: ${m.id}`);
  assert.ok(
    built.length > m.title.length + 20,
    `設問が題名だけになっている: ${m.id}`
  );
  // 観点を設問に混ぜない（羅列すると何を書くのか定まらない）
  for (const f of m.focusPoints) {
    assert.ok(!built.includes(f), `観点が設問に混ざっている: ${m.id} / ${f}`);
  }
}

console.log(
  `[verify-report-question] OK (${reportMaterials.length}件の課題文で確認)`
);
