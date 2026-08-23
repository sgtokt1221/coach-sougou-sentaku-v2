import type { RawCorrection } from "@/lib/sentence-drill/personal";

/**
 * 生徒が自分の文を直した結果を判定させる。
 *
 * AI の直し案（suggestion）は「正解」ではなく参考として渡す。
 * 言い回しが違っても、指摘された問題が解消していれば ok とする。
 * ここを「suggestion と一致するか」にすると、生徒は言い換えを覚えるだけになる。
 */
export function buildSentenceRewritePrompt(
  items: { correction: RawCorrection; answer: string }[]
): string {
  const list = items
    .map((it, i) =>
      [
        `【${i}】`,
        `元の文: ${it.correction.original}`,
        `指摘された問題: ${it.correction.reason}（種別: ${it.correction.type}）`,
        `添削AIの直し案（参考）: ${it.correction.suggestion}`,
        `生徒の直し: ${it.answer}`,
      ].join("\n")
    )
    .join("\n\n");

  return `あなたは高校生の小論文を指導する講師です。
生徒が、自分の答案で指摘された文を書き直しました。1件ずつ判定してください。

判定の基準:
- 指摘された問題が解消していれば ok=true とする
- 直し案と言い回しが違っても、問題が解消していれば ok=true とする
- 問題は解消したが別の問題（話し言葉・主述のねじれ・冗長）が入った場合は ok=false とし、何が入ったかを書く
- 元の文とほとんど変わっていない場合は ok=false とする
- 意味が変わってしまった場合は ok=false とし、元の意味を保つ直し方を示す

comment は生徒に見せます。1〜2文で、どこがどう良く（悪く）なったかを具体的に書いてください。
「良いですね」「もう少しです」のような中身のない評価はしないこと。

overall には、3件を通して見えるこの生徒の癖を1文で書いてください。
癖が読み取れなければ空文字にしてください。

${list}`;
}
