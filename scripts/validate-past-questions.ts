/**
 * 課題文型（report）の設問が、課題文を読まないと答えられない形になっているかを検査する。
 *
 * 監査（2026-09-09）で分かったこと:
 * 課題文つき69件のうち、本文にしか無い情報（筆者の主張・傍線部・要約）を要求する設問は
 * **6件だけ**だった。残り63件は「課題文を読み、〜について論じなさい」型で、
 * 題材が設問側に書いてあるため、課題文を読まずに一般論で書ける。
 *
 * 採点側（source-engagement.ts）で「触れていない答案」を減点するようにしたが、
 * 設問が読ませる形になっていなければ、生徒は読まずに書いて減点されるだけになる。
 * 出題そのものを縛るのがここの役目。
 *
 * 実行: npx tsx scripts/validate-past-questions.ts
 */

import {
  PAST_QUESTIONS,
  resolveQuestionType,
} from "../src/data/essay-past-questions";

/**
 * 本文にしか無い情報を要求する語。
 * 「課題文を読み」だけでは足りない（題材が設問に書いてあれば読まずに書けるため）。
 */
const BINDS_TO_SOURCE =
  /筆者|著者の主張|傍線|下線|論旨|要約し|文中の|課題図書の内容|本文中/;

let errors = 0;
const fail = (msg: string) => {
  console.error(`  ✗ ${msg}`);
  errors++;
};

const reports = PAST_QUESTIONS.filter(
  (pq) => resolveQuestionType(pq) === "report"
);

console.log(`課題文型（report）: ${reports.length}件を検査`);

for (const pq of reports) {
  const d = String(pq.description ?? "");
  if (!d.trim()) {
    fail(`${pq.id}: 設問（description）が空`);
    continue;
  }
  if (!BINDS_TO_SOURCE.test(d)) {
    fail(
      `${pq.id}: 設問が課題文に縛られていない（筆者の主張・傍線部・要約などに触れていない）\n      「${d.slice(0, 70)}」`
    );
  }
  // 課題文が短すぎると、読まなくても書ける一般論と偶然重なる
  const len = String(pq.sourceText ?? "").length;
  if (len > 0 && len < 400) {
    fail(`${pq.id}: 課題文が短すぎる（${len}字）`);
  }
}

if (errors > 0) {
  console.error(
    `\n${errors}件。課題文型の設問は「筆者の〜という主張を踏まえ」の形にして、` +
      `課題文を読まないと答えられないようにする。\n` +
      `下書きの生成は scripts/draft-passage-questions.ts を使う。`
  );
  process.exit(1);
}

console.log("validate-past-questions OK");
