import assert from "node:assert";
import { essayResultKind, pickFocus } from "../src/lib/essay/result-focus";

// タイプの判定
assert.equal(essayResultKind("oral_exam"), "oral");
assert.equal(essayResultKind("lecture"), "lecture");
assert.equal(essayResultKind("data-analysis"), "data");
assert.equal(essayResultKind("mixed"), "data");
assert.equal(essayResultKind("report"), "passage");
assert.equal(essayResultKind("essay", "課題文の本文"), "passage");
assert.equal(essayResultKind("essay", "  "), "theme");
assert.equal(essayResultKind(null), "theme");

// 今回の課題は AI が総合した priorityImprovement をそのまま出す。
// 字数・読み違い・設問への答えなど、個々の指摘では差し替えない
{
  const fb = {
    priorityImprovement: "理由を一つしか検討していないことが、根拠と結論の弱さの元になっている。",
    improvements: ["比べる観点を1つに絞る"],
    reportInsights: { misreadings: ["筆者はそう言っていない"] },
    taskFulfillment: { answersQuestion: false, note: "n", requirements: [] },
  };
  assert.deepEqual(pickFocus(fb), {
    text: fb.priorityImprovement,
    keys: ["priority:0"],
  });
}
// 総合が無い（古い答案の欠け）ときは改善点1件目、何も無ければ null
assert.deepEqual(pickFocus({ improvements: ["a"] }), {
  text: "a",
  keys: ["improvement:0"],
});
assert.equal(pickFocus({}), null);

console.log("verify-result-focus: ok");
