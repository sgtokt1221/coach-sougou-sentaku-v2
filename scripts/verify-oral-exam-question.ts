/**
 * 口頭試問型の小問集合を、指定どおりの形に正規化できているか確かめる。
 *
 * モデルは字数の合計をよく外す。そのまま通すと答案の充足率
 * （calculateFillRate）が指定と違う値で計算され、「字数が足りない」の判定が
 * 黙ってずれる。ここが緩むと画面にもエラーは出ない。
 */
import assert from "node:assert";
import {
  ORAL_EXAM_MAX_QUESTIONS,
  buildOralExamQuestion,
  joinOralExamAnswers,
  normalizeOralExamQuestionSet,
} from "../src/lib/essay/oral-exam-question";
import type { OralExamQuestionSet } from "../src/lib/types/essay";

function make(wordLimits: number[], total: number): OralExamQuestionSet {
  return {
    theme: "表現の自由",
    totalWordLimit: total,
    subQuestions: wordLimits.map((w, i) => ({
      no: i + 1,
      prompt: `問${i + 1}の設問文`,
      wordLimit: w,
      aim: "確認したいこと",
    })),
  };
}

// 合計が指定とずれていても、比率を保ったまま合計へ寄せる
for (const [limits, total] of [
  [[100, 200, 300], 800],
  [[500, 500], 600],
  [[300, 300, 300, 300], 1000],
  [[10, 10, 10], 300],
] as [number[], number][]) {
  const out = normalizeOralExamQuestionSet(make(limits, 0), total);
  const sum = out.subQuestions.reduce((s, q) => s + q.wordLimit, 0);
  assert.equal(sum, total, `合計が合っていない: ${sum} != ${total}`);
  assert.equal(out.totalWordLimit, total);
  assert.ok(
    out.subQuestions.every((q) => q.wordLimit >= 50),
    "50字未満の小問が残っている"
  );
  assert.deepEqual(
    out.subQuestions.map((q) => q.no),
    out.subQuestions.map((_, i) => i + 1),
    "問番号が振り直されていない"
  );
}

// 上限を超える数は切る
const tooMany = normalizeOralExamQuestionSet(
  make([100, 100, 100, 100, 100, 100, 100], 0),
  700
);
assert.equal(tooMany.subQuestions.length, ORAL_EXAM_MAX_QUESTIONS);
assert.equal(
  tooMany.subQuestions.reduce((s, q) => s + q.wordLimit, 0),
  700
);

// 設問文に問番号と字数が入る。採点の観点(aim)は生徒に見せない
const set = normalizeOralExamQuestionSet(make([200, 300, 300], 0), 800);
const question = buildOralExamQuestion(set);
assert.ok(question.includes("問1"), "問番号が無い");
assert.ok(question.includes("字程度"), "字数の目安が無い");
assert.ok(!question.includes("確認したいこと"), "aim が生徒に見えている");

// 答えは1本の本文へ連結される（保存・添削は本文1つの前提）
const joined = joinOralExamAnswers(set, ["あ", "い", "う"]);
assert.ok(joined.startsWith("問1\nあ"), joined);
assert.ok(joined.includes("問3\nう"), joined);

console.log("[verify-oral-exam-question] OK");
