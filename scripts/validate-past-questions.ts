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
import { reportMaterials } from "../src/data/essay-report-materials";

/**
 * 本文にしか無い情報を要求する語。
 * 「課題文を読み」だけでは足りない（題材が設問に書いてあれば読まずに書けるため）。
 */
/**
 * 本文にしか無い情報を要求する形。次のどちらかであれば縛られているとみなす。
 *   - 筆者の主張・傍線部・要約など、本文を指す語を使っている
 *   - 「課題文が挙げる配分の原理のうち二つを取り上げ」のように、
 *     課題文の中身を名指しして取り出させている
 *
 * 逆に「課題文の内容を踏まえ」「課題文を踏まえ」だけでは足りない。
 * 題材が設問側に書いてあるぶん、読まずに一般論で書けてしまう
 * （この形の設問に対し、課題文に一度も触れない答案が実際に提出されていた）。
 */
const BINDS_TO_SOURCE =
  /筆者|著者の主張|傍線|下線|論旨|要約し|文中の|課題図書の内容|本文中|課題文が(挙げる|示す|扱う|述べる|説明する|問う)/;

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

/**
 * レポート教材25件も同じ questionType="report" で採点に入る。
 * 過去問だけ直しても、教材側が「課題文の内容を踏まえ」のままだと
 * 同じ穴が残る（実際、この形の設問に対して課題文に一度も触れない答案が
 * 提出されていた）。教材は本文が手元にあるので、引用が本文に実在するかまで見る。
 */
console.log(`\nレポート教材: ${reportMaterials.length}件を検査`);
for (const m of reportMaterials) {
  if (!BINDS_TO_SOURCE.test(m.question)) {
    fail(
      `${m.id}: 設問が課題文に縛られていない\n      「${m.question.slice(0, 70)}」`
    );
    continue;
  }
  // 設問が引く「」は本文に実在しなければならない。作文した引用を生徒に見せない
  for (const q of [...m.question.matchAll(/「([^」]+)」/g)].map((x) => x[1])) {
    if (q.length >= 8 && !m.body.includes(q)) {
      fail(`${m.id}: 設問の引用が課題文に無い\n      「${q}」`);
    }
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
